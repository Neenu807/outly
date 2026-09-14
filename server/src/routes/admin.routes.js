import express from "express";
import {
  approveRequest,
  listRequests,
  rejectRequest,
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/authorize.js";
import { adminLimiter } from "../middleware/rateLimit.js";
import validate from "../middleware/validate.js";
import {
  listOrganizerRequestsQuery,
  rejectOrganizerRequestSchema,
} from "../validators/organizer.validator.js";

/**
 * Every /admin route is guarded at the router, not per route (§15, §18), so a
 * route added here later cannot be forgotten. Admin accounts are created
 * verified by scripts/createAdmin.js, so no verification guard is needed.
 *
 * The admin dashboard, user directory and review hiding join in Phases 4 and 6.
 */
const router = express.Router();

router.use(requireAuth, requireAdmin, adminLimiter);

router.get("/organizer-requests", validate(listOrganizerRequestsQuery, "query"), listRequests);
router.patch("/organizer-requests/:id/approve", approveRequest);
router.patch(
  "/organizer-requests/:id/reject",
  validate(rejectOrganizerRequestSchema, "body"),
  rejectRequest,
);

export default router;
