import {
  registerUser,
  loginUser,
  getUserById,
} from "../services/authService.js";
import env from "../config/env.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { apiError } from "../utils/errorCodes.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import toUserResponse from "../utils/userResponse.js";

/**
 * Cross-site cookie settings come from env (§22, §27): SameSite=None + Secure
 * in production, Lax on localhost. Scoping Path to the auth routes keeps the
 * refresh token off every other request.
 */
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await registerUser(name, email, password);

  return sendSuccess(res, {
    status: 201,
    data: { user: toUserResponse(user) },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await loginUser(email, password);
  const userId = user._id.toString();

  res.cookie("refreshToken", generateRefreshToken(userId), refreshCookieOptions);

  return sendSuccess(res, {
    data: {
      accessToken: generateAccessToken(userId),
      user: toUserResponse(user),
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.userId);

  return sendSuccess(res, { data: { user: toUserResponse(user) } });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw apiError("UNAUTHENTICATED", "Refresh token is required");
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw apiError("UNAUTHENTICATED", "Invalid or expired refresh token");
  }

  const user = await getUserById(payload.userId);

  return sendSuccess(res, {
    data: { accessToken: generateAccessToken(user._id.toString()) },
  });
});

export { register, login, getMe, refresh };
