import bcrypt from "bcrypt";
import mongoose from "mongoose";
import env from "../config/env.js";
import User from "../models/User.js";
import { apiError } from "../utils/errorCodes.js";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt.js";

/**
 * A hash of a throwaway value, at the same cost as every real hash. An unknown
 * email is compared against it, so both login failure paths spend one bcrypt
 * comparison (§18) — otherwise response time alone reveals which addresses
 * have accounts.
 *
 * Started at import so the first unknown-email login doesn't also pay for
 * computing it. The empty catch only prevents an unhandled rejection before the
 * first await; awaiting it still rethrows.
 */
const dummyHash = bcrypt.hash("outly:timing-equaliser", env.BCRYPT_SALT_ROUNDS);
dummyHash.catch(() => {});

const unauthenticated = (message) => apiError("UNAUTHENTICATED", message);

const registerUser = async ({ name, email, password }) => {
  if (await User.exists({ email })) {
    throw apiError("EMAIL_IN_USE", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  // The unique index is the enforcement; the check above is the friendly
  // error. A concurrent duplicate that slips between the two surfaces as
  // E11000, which the terminal handler maps to the same EMAIL_IN_USE.
  return User.create({ name, email, passwordHash });
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? (await dummyHash),
  );

  // One code for both failures — deliberately indistinguishable (§20).
  if (!user || !matches) {
    throw apiError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  return user;
};

/**
 * Turns a verified token payload into a live user, or refuses. This is where
 * `tokenVersion` does its job: a bump on the account invalidates every token
 * issued before it.
 */
const resolveSessionUser = async (payload) => {
  const { sub, tokenVersion } = payload ?? {};

  // Checked before the query so a malformed subject is a 401, not a CastError.
  if (!mongoose.isValidObjectId(sub) || !Number.isInteger(tokenVersion)) {
    throw unauthenticated("Invalid authentication token");
  }

  const user = await User.findById(sub);

  // Deleted and revoked get the same answer; which one it was is not the
  // caller's business.
  if (!user || user.tokenVersion !== tokenVersion) {
    throw unauthenticated("Session is no longer valid");
  }

  return user;
};

const authenticateAccessToken = async (token) => {
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthenticated("Invalid or expired authentication token");
  }

  return resolveSessionUser(payload);
};

const authenticateRefreshToken = async (token) => {
  if (!token) {
    throw unauthenticated("Refresh token is required");
  }

  let payload;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthenticated("Invalid or expired refresh token");
  }

  return resolveSessionUser(payload);
};

export {
  registerUser,
  loginUser,
  authenticateAccessToken,
  authenticateRefreshToken,
};
