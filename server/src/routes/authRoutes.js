import express from "express";
import { register , login, getMe, refresh}  from "../controllers/authController.js";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/authValidator.js";
import verifyJWT from "../middleware/auth.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", verifyJWT, getMe);
router.post("/refresh", refresh);

export default router;