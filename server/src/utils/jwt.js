import jwt from "jsonwebtoken";
import env from "../config/env.js";

// NOTE (Step B): the payload becomes `{ sub, tokenVersion }` per §18. It is
// still `{ userId }` here because `tokenVersion` does not exist on the User
// model yet.

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
