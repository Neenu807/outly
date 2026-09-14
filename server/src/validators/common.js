import { z } from "zod";

/** Shared query and field schemas (ARCHITECTURE §21). */

const page = z.coerce.number().int("page must be a whole number").min(1).default(1);

// An uncapped limit is a free DoS. An over-large value clamps rather than
// failing (§26: limit=999 clamps to 50).
const limit = z.coerce
  .number()
  .int("limit must be a whole number")
  .min(1)
  .default(12)
  .transform((value) => Math.min(value, 50));

const httpsUrl = z
  .string()
  .trim()
  .max(500, "URL is too long")
  .url("Must be a valid URL")
  .refine((value) => value.startsWith("https://"), "Must start with https://");

export { page, limit, httpsUrl };
