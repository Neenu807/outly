import express from "express";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import organizerRoutes from "./organizer.routes.js";
import userRoutes from "./users.routes.js";

/**
 * Every route in the application mounts here, under `/api/v1` (§29).
 * Categories, activities, discover, bookings and reviews join in Phases 2–6.
 */
const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/organizer", organizerRoutes);
router.use("/admin", adminRoutes);

export default router;
