import { z } from "zod";
import { httpsUrl, limit, page } from "./common.js";

// An empty link field from a form means "no link", not "an invalid link".
const optionalHttpsUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  httpsUrl.optional(),
);

/** POST /organizer/request (§7, §21). */
const organizerRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(30, "Tell us a little more — at least 30 characters")
    .max(500, "Keep it under 500 characters"),
  contactLink: optionalHttpsUrl,
});

/** GET /admin/organizer-requests (§19, §21). */
const listOrganizerRequestsQuery = z.object({
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  q: z.string().trim().max(100, "Search is too long").optional(),
  page,
  limit,
});

/**
 * PATCH /admin/organizer-requests/:id/reject. The reason is shown to the
 * applicant, so it has to be something they can act on (§7).
 */
const rejectOrganizerRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Give the applicant a reason they can act on — at least 10 characters")
    .max(300, "Keep the reason under 300 characters"),
});

export { organizerRequestSchema, listOrganizerRequestsQuery, rejectOrganizerRequestSchema };
