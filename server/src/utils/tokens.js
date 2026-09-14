import crypto from "node:crypto";

/**
 * Single-use link tokens for email verification and password reset (§18).
 *
 * The raw token goes into the email and nowhere else; only its SHA-256 hash is
 * stored. A database leak therefore yields hashes that cannot be turned back
 * into working links. SHA-256 rather than bcrypt is correct here: the token is
 * 256 bits of randomness, so there is nothing for a slow hash to protect.
 */

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const createToken = () => {
  const token = crypto.randomBytes(32).toString("base64url");

  return { token, hash: hashToken(token) };
};

export { createToken, hashToken };
