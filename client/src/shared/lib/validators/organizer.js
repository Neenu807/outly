import { z } from "zod";

/** Mirrors server/src/validators/organizer.validator.js. */

export const organizerRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(30, "Tell us a little more — at least 30 characters")
    .max(500, "Keep it under 500 characters"),
  contactLink: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(
      z
        .string()
        .url("Enter a valid URL")
        .refine((value) => value.startsWith("https://"), "Use an https:// link")
        .optional(),
    ),
});

export const rejectReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Give them something they can act on — at least 10 characters")
    .max(300, "Keep it under 300 characters"),
});
