import express from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import {
  authLimiter,
  forgotPasswordLimiter,
  passwordChangeLimiter,
  refreshLimiter,
  resendVerificationLimiter,
} from "../middleware/rateLimit.js";
import validate from "../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema, "body"), register);
router.post("/login", authLimiter, validate(loginSchema, "body"), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);

// Per-account limiters key on req.user, so they must follow requireAuth.
router.patch(
  "/password",
  requireAuth,
  passwordChangeLimiter,
  validate(changePasswordSchema, "body"),
  changePassword,
);

router.post("/verify-email", validate(verifyEmailSchema, "body"), verifyEmail);
router.post("/resend-verification", requireAuth, resendVerificationLimiter, resendVerification);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema, "body"),
  forgotPassword,
);
router.post("/reset-password", validate(resetPasswordSchema, "body"), resetPassword);

export default router;
