import express from "express";
import { register, login, getMe, refresh } from "../controllers/authController.js";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/authValidator.js";
import verifyJWT from "../middleware/auth.js";
import { authLimiter, refreshLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.get("/me", verifyJWT, getMe);

export default router;
