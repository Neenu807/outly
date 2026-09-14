import express from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./authRoutes.js";

/**
 * Every route in the application mounts here, under `/api/v1` (§29).
 * Routers are added as their phase lands: categories, activities, discover,
 * organizer, bookings, reviews and admin are Phases 2–6.
 */
const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

export default router;
