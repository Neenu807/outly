import express from "express";
import { getMe, login, refresh, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter, refreshLimiter } from "../middleware/rateLimit.js";
import validate from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

// logout, verify-email, resend-verification, forgot-password and
// reset-password join this router in Step C (Phase 1).

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema, "body"), register);
router.post("/login", authLimiter, validate(loginSchema, "body"), login);
router.post("/refresh", refreshLimiter, refresh);
router.get("/me", requireAuth, getMe);

export default router;
