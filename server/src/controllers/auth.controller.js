import env from "../config/env.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import { runInBackground } from "../utils/background.js";
import toUserResponse from "../utils/userResponse.js";
import { generateAccessToken, issueRefreshToken } from "../utils/jwt.js";
import {
  authenticateRefreshToken,
  changePassword as changePasswordForUser,
  issueVerificationToken,
  loginUser,
  logoutUser,
  redeemEmailVerification,
  registerUser,
  requestPasswordReset,
  resetPassword as resetPasswordWithToken,
} from "../services/auth.service.js";
import { sendVerificationEmail } from "../services/notification.service.js";

const REFRESH_COOKIE = "refreshToken";

/**
 * Cross-site cookie flags come from env (§22, §27): SameSite=None + Secure in
 * production, Lax on localhost. Path is scoped to the auth routes so the
 * refresh token rides along on nothing else. Clearing must repeat the same
 * attributes, or the browser keeps the cookie.
 */
const refreshCookieAttributes = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: "/api/v1/auth",
});

const setRefreshCookie = (res, user) => {
  const { token, expiresAt } = issueRefreshToken(user);

  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieAttributes(), expires: expiresAt });
};

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, refreshCookieAttributes());

const register = asyncHandler(async (req, res) => {
  const { user, verificationToken } = await registerUser(req.body);

  sendSuccess(res, { status: 201, data: { user: toUserResponse(user) } });

  // After the response: a mail outage must not fail a registration (§17).
  runInBackground("verification email", () => sendVerificationEmail(user, verificationToken));
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);

  setRefreshCookie(res, user);

  return sendSuccess(res, {
    data: { accessToken: generateAccessToken(user), user: toUserResponse(user) },
  });
});

const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user);

  clearRefreshCookie(res);

  return sendNoContent(res);
});

/** The session bootstrap. `req.user` is already loaded by requireAuth. */
const getMe = (req, res) => sendSuccess(res, { data: { user: toUserResponse(req.user) } });

const refresh = asyncHandler(async (req, res) => {
  const user = await authenticateRefreshToken(req.cookies?.[REFRESH_COOKIE]);

  return sendSuccess(res, { data: { accessToken: generateAccessToken(user) } });
});

const verifyEmail = asyncHandler(async (req, res) => {
  await redeemEmailVerification(req.body.token);

  return sendSuccess(res, { data: { isEmailVerified: true } });
});

const resendVerification = asyncHandler(async (req, res) => {
  const token = await issueVerificationToken(req.user);

  sendNoContent(res);

  if (token) {
    runInBackground("verification email", () => sendVerificationEmail(req.user, token));
  }
});

/** Always 204 — even for an address with no account (§18). */
const forgotPassword = (req, res) => {
  sendNoContent(res);

  runInBackground("password reset request", () => requestPasswordReset(req.body.email));
};

const resetPassword = asyncHandler(async (req, res) => {
  await resetPasswordWithToken(req.body);

  // tokenVersion was bumped, so this browser's refresh cookie is dead anyway.
  clearRefreshCookie(res);

  return sendNoContent(res);
});

const changePassword = asyncHandler(async (req, res) => {
  await changePasswordForUser(req.user, req.body);

  // tokenVersion was bumped, so every token — this request's included — is
  // dead. Clearing the cookie tells this browser so plainly.
  clearRefreshCookie(res);

  return sendNoContent(res);
});

export {
  register,
  login,
  logout,
  changePassword,
  getMe,
  refresh,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
