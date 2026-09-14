import bcrypt from "bcrypt";
import env from "../src/config/env.js";
import User from "../src/models/User.js";
import { generateAccessToken } from "../src/utils/jwt.js";

export const PASSWORD = "correct horse battery staple";

let sequence = 0;
let passwordHash;

/**
 * Creates a user straight through the model, bypassing the API, so a test can
 * construct any persona in the §18 matrix — including ones the API cannot
 * produce yet (approved organizers, admins) until later phases.
 */
export const createUser = async (overrides = {}) => {
  // Hashed once per file: every fixture shares a password, and bcrypt is the
  // slowest thing in the suite.
  passwordHash ??= await bcrypt.hash(PASSWORD, env.BCRYPT_SALT_ROUNDS);
  sequence += 1;

  return User.create({
    name: `Test User ${sequence}`,
    email: `user${sequence}@example.com`,
    passwordHash,
    ...overrides,
  });
};

export const bearer = (user) => `Bearer ${generateAccessToken(user)}`;
