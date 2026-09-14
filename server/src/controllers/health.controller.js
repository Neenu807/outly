import { dbStatus } from "../config/db.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * `GET /api/v1/health` → `{ status, uptime, db }` (ARCHITECTURE §19, §29).
 *
 * Reports `503` when the database is not connected, so a platform health check
 * fails the instance rather than reporting a green API in front of a dead DB.
 */
const getHealth = asyncHandler(async (req, res) => {
  const db = dbStatus();
  const healthy = db === "connected";

  return sendSuccess(res, {
    status: healthy ? 200 : 503,
    data: {
      status: healthy ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      db,
    },
  });
});

export { getHealth };
