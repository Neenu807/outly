import bcrypt from "bcrypt";
import mongoose from "mongoose";
import env from "../config/env.js";
import User from "../models/User.js";
import { apiError } from "../utils/errorCodes.js";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt.js";
import { createToken, hashToken } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "./notification.service.js";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

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

// Expired, already-used and never-issued links get one answer, so the endpoint
// cannot be used to probe which tokens once existed. §20 has no dedicated code;
// §26 specifies a 400.
const invalidLink = () =>
  apiError("VALIDATION_FAILED", "This link is invalid or has expired", {
    token: "This link is invalid or has expired",
  });

const expiresAfter = (ms) => new Date(Date.now() + ms);

const registerUser = async ({ name, email, password }) => {
  if (await User.exists({ email })) {
    throw apiError("EMAIL_IN_USE", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const verification = createToken();

  // The unique index is the enforcement; the check above is the friendly
  // error. A concurrent duplicate that slips between the two surfaces as
  // E11000, which the terminal handler maps to the same EMAIL_IN_USE.
  const user = await User.create({
    name,
    email,
    passwordHash,
    emailVerificationTokenHash: verification.hash,
    emailVerificationExpires: expiresAfter(VERIFICATION_TTL_MS),
  });

  return { user, verificationToken: verification.token };
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

/** Logout is one of exactly three tokenVersion events (§18). */
const logoutUser = async (user) => {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
};

/**
 * Redeems a verification link.
 *
 * The flip is guarded in the filter — unverified AND unexpired — so it is one
 * atomic operation. The token hash is deliberately KEPT afterwards (only the
 * expiry is cleared): that is what lets a second click on the same link answer
 * "already verified" instead of "invalid", which §18 and §26 require. A
 * retained hash can only ever mark an already-verified account as verified,
 * so it grants nothing.
 */
const redeemEmailVerification = async (token) => {
  const tokenHash = hashToken(token);

  const verified = await User.findOneAndUpdate(
    {
      emailVerificationTokenHash: tokenHash,
      isEmailVerified: false,
      emailVerificationExpires: { $gt: new Date() },
    },
    { $set: { isEmailVerified: true }, $unset: { emailVerificationExpires: 1 } },
    { returnDocument: "after" },
  );

  if (verified) {
    return;
  }

  if (await User.exists({ emailVerificationTokenHash: tokenHash, isEmailVerified: true })) {
    return;
  }

  throw invalidLink();
};

/**
 * Issues a fresh verification token, retiring any earlier link. Returns null
 * for an account that is already verified — there is nothing to send.
 */
const issueVerificationToken = async (user) => {
  if (user.isEmailVerified) {
    return null;
  }

  const { token, hash } = createToken();

  const { matchedCount } = await User.updateOne(
    { _id: user._id, isEmailVerified: false },
    {
      $set: {
        emailVerificationTokenHash: hash,
        emailVerificationExpires: expiresAfter(VERIFICATION_TTL_MS),
      },
    },
  );

  return matchedCount > 0 ? token : null;
};

/**
 * Runs AFTER the controller has already answered 204, so an unknown address and
 * a real one are indistinguishable — in status, body and timing (§18).
 */
const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return;
  }

  const { token, hash } = createToken();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetTokenHash: hash,
        passwordResetExpires: expiresAfter(PASSWORD_RESET_TTL_MS),
      },
    },
  );

  await sendPasswordResetEmail(user, token);
};

/**
 * Single use by construction: the token is matched and cleared in the same
 * atomic update, so two concurrent redemptions cannot both succeed. Bumping
 * tokenVersion ends every existing session (§18).
 */
const resetPassword = async ({ token, password }) => {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.findOneAndUpdate(
    {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    },
    {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: "after" },
  );

  if (!user) {
    throw invalidLink();
  }
};

/**
 * Password change — one of exactly three tokenVersion events (§18). It ends
 * every session for the account, including the one making the request, so the
 * member signs in again with the new password.
 *
 * A wrong current password is a 400, not a 401: the session itself is valid,
 * and a 401 would send the client's refresh interceptor after a problem that no
 * refresh can fix.
 */
const changePassword = async (user, { currentPassword, newPassword }) => {
  const account = await User.findById(user._id).select("+passwordHash");

  if (!account) {
    throw unauthenticated("Account no longer exists");
  }

  const wrongCurrentPassword = () =>
    apiError("VALIDATION_FAILED", "Current password is incorrect", {
      currentPassword: "Current password is incorrect",
    });

  if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
    throw wrongCurrentPassword();
  }

  if (await bcrypt.compare(newPassword, account.passwordHash)) {
    throw apiError("VALIDATION_FAILED", "Choose a password different from your current one", {
      newPassword: "Choose a password different from your current one",
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  // Guarded on the hash that was just verified. If the password changed in
  // between — a concurrent change, or a reset — this matches nothing, instead
  // of overwriting a password the caller never proved they knew.
  //
  // Any outstanding reset link is retired too, so an old email cannot undo
  // the password the member has just chosen.
  const updated = await User.findOneAndUpdate(
    { _id: account._id, passwordHash: account.passwordHash },
    {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw wrongCurrentPassword();
  }
};

export {
  changePassword,
  registerUser,
  loginUser,
  authenticateAccessToken,
  authenticateRefreshToken,
  logoutUser,
  redeemEmailVerification,
  issueVerificationToken,
  requestPasswordReset,
  resetPassword,
};
