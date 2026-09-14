import env from "../config/env.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import toUserResponse from "../utils/userResponse.js";
import { generateAccessToken, issueRefreshToken } from "../utils/jwt.js";
import {
  authenticateRefreshToken,
  loginUser,
  registerUser,
} from "../services/auth.service.js";

const REFRESH_COOKIE = "refreshToken";

/**
 * Cross-site cookie flags come from env (§22, §27): SameSite=None + Secure in
 * production, Lax on localhost. Path is scoped to the auth routes so the
 * refresh token rides along on nothing else. Its expiry is taken from the token
 * itself, never restated.
 */
const setRefreshCookie = (res, user) => {
  const { token, expiresAt } = issueRefreshToken(user);

  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/api/v1/auth",
    expires: expiresAt,
  });
};

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  return sendSuccess(res, { status: 201, data: { user: toUserResponse(user) } });
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);

  setRefreshCookie(res, user);

  return sendSuccess(res, {
    data: { accessToken: generateAccessToken(user), user: toUserResponse(user) },
  });
});

/** The session bootstrap. `req.user` is already loaded by requireAuth. */
const getMe = (req, res) =>
  sendSuccess(res, { data: { user: toUserResponse(req.user) } });

const refresh = asyncHandler(async (req, res) => {
  const user = await authenticateRefreshToken(req.cookies?.[REFRESH_COOKIE]);

  return sendSuccess(res, { data: { accessToken: generateAccessToken(user) } });
});

export { register, login, getMe, refresh };
