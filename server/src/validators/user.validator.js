import { z } from "zod";
import { httpsUrl } from "./common.js";

const E164 = /^\+[1-9]\d{7,14}$/;

// "+91 98765-43210" and "+91 (98765) 43210" are the same number, so formatting
// is stripped before the E.164 check and before storage (§21).
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(E164, "Use international format, e.g. +919876543210"));

const interestSlug = z
  .string()
  .trim()
  .toLowerCase()
  .max(40, "Interest is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Interests are category slugs, e.g. pottery or table-tennis");

/**
 * PATCH /users/me (§19). Exactly these fields and no others: role,
 * organizerStatus, email, isEmailVerified and tokenVersion are not in the
 * schema, so validate() strips them before the service sees the body (§21).
 *
 * `null` clears an optional field.
 */
const updateMeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be at most 80 characters")
      .optional(),
    avatarUrl: httpsUrl.nullable().optional(),
    city: z.string().trim().min(1, "City cannot be empty").max(60, "City is too long").nullable().optional(),
    interests: z
      .array(interestSlug)
      .max(15, "At most 15 interests")
      .transform((values) => [...new Set(values)])
      .optional(),
    phone: phone.nullable().optional(),
    smsOptIn: z.boolean().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, "Provide at least one field to update");

export { updateMeSchema };
