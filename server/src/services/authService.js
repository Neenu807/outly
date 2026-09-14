import bcrypt from "bcrypt";
import User from "../models/User.js";
import env from "../config/env.js";
import { apiError } from "../utils/errorCodes.js";

const registerUser = async (name, email, password) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw apiError("EMAIL_IN_USE", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  return user;
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw apiError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw apiError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  return user;
};

const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    // The token was valid but the account is gone — that is an authentication
    // failure, not a missing resource (§20 has no USER_NOT_FOUND).
    throw apiError("UNAUTHENTICATED", "Account no longer exists");
  }

  return user;
};

export { registerUser, loginUser, getUserById };
