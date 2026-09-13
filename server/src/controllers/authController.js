import { registerUser, loginUser, getUserById } from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import ApiError from "../utils/ApiError.js";
import toUserResponse from "../utils/userResponse.js";

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await registerUser(name, email, password);

  const userResponse = toUserResponse(user);

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await loginUser(email, password);
  const userId = user._id.toString();

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(userId);

  res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const userResponse = toUserResponse(user);

  res.status(200).json({
    success: true,
    data: {
      accessToken,
      user: userResponse,
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.userId);

  const userResponse = toUserResponse(user);

  res.status(200).json({
    success: true,
    data: {
      user: userResponse,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(
      401,
      "REFRESH_TOKEN_REQUIRED",
      "Refresh token is required",
    );
  }

  try {
    const tokenData = verifyRefreshToken(refreshToken);

    const user = await getUserById(tokenData.userId);

    const accessToken = generateAccessToken(user._id.toString());

    res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Invalid or expired refresh token",
    );
  }
});

export {register, login, getMe, refresh} ;