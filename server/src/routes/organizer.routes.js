import express from "express";
import {
  createOrganizerRequest,
  getMyOrganizerRequest,
} from "../controllers/organizer.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireVerified } from "../middleware/authorize.js";
import { organizerRequestLimiter } from "../middleware/rateLimit.js";
import validate from "../middleware/validate.js";
import { organizerRequestSchema } from "../validators/organizer.validator.js";

// Activity create/edit/publish/cancel, images, attendees and the organizer
// dashboard join this router in Phase 4.

const router = express.Router();

router.get("/request", requireAuth, getMyOrganizerRequest);

// §18: requesting organizer capability requires a verified email.
router.post(
  "/request",
  organizerRequestLimiter,
  requireAuth,
  requireVerified,
  validate(organizerRequestSchema, "body"),
  createOrganizerRequest,
);

export default router;
