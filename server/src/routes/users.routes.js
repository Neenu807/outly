import express from "express";
import { updateMe } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { updateMeSchema } from "../validators/user.validator.js";

const router = express.Router();

router.patch("/me", requireAuth, validate(updateMeSchema, "body"), updateMe);

export default router;
