import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Token payloads carry `{ sub, tokenVersion }` and nothing else (ARCHITECTURE
 * §18). A JWT is signed, not encrypted, so anything in it is readable by
 * whoever holds it — and anything in it is stale the moment it changes.
 * `role`, `organizerStatus` and `isEmailVerified` are read from the database on
 * every request instead, so verifying an email or approving an organizer takes
 * effect on the very next call.
 *
 * The algorithm is pinned on both sign and verify, which closes `alg: none`
 * and algorithm-confusion tokens outright.
 */

const ALGORITHM = "HS256";

const sign = (user, secret, expiresIn) =>
  jwt.sign({ tokenVersion: user.tokenVersion }, secret, {
    subject: String(user._id),
    expiresIn,
    algorithm: ALGORITHM,
  });

const verify = (token, secret) => jwt.verify(token, secret, { algorithms: [ALGORITHM] });

const generateAccessToken = (user) =>
  sign(user, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES);

/**
 * Returns the token with its expiry, so the cookie's lifetime is derived from
 * the token rather than restated beside it — the two cannot drift when
 * JWT_REFRESH_EXPIRES changes.
 */
const issueRefreshToken = (user) => {
  const token = sign(user, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES);
  const { exp } = jwt.decode(token);

  return { token, expiresAt: new Date(exp * 1000) };
};

const verifyAccessToken = (token) => verify(token, env.JWT_ACCESS_SECRET);

const verifyRefreshToken = (token) => verify(token, env.JWT_REFRESH_SECRET);

export {
  generateAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
