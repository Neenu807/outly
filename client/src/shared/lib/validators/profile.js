import { z } from "zod";

/** Mirrors server/src/validators/user.validator.js, shaped for a form. */

const E164 = /^\+[1-9]\d{7,14}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A blank optional field means "clear it", which the API spells null.
const blankToNull = (value) => (value.trim() === "" ? null : value.trim());

export const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Use at least 2 characters")
      .max(80, "Keep it under 80 characters"),
    city: z
      .string()
      .transform(blankToNull)
      .pipe(z.string().max(60, "Keep it under 60 characters").nullable()),
    avatarUrl: z
      .string()
      .transform(blankToNull)
      .pipe(
        z
          .string()
          .url("Enter a valid URL")
          .refine((value) => value.startsWith("https://"), "Use an https:// link")
          .nullable(),
      ),
    // Typed as a comma-separated list; sent as an array of slugs.
    interests: z
      .string()
      .transform((value) => [
        ...new Set(
          value
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        ),
      ])
      .pipe(
        z
          .array(
            z.string().max(40, "One of those is too long").regex(SLUG, "Use slugs like pottery or table-tennis"),
          )
          .max(15, "Pick at most 15"),
      ),
    phone: z
      .string()
      .transform((value) => blankToNull(value.replace(/[\s().-]/g, "")))
      .pipe(z.string().regex(E164, "Use international format, e.g. +919876543210").nullable()),
    smsOptIn: z.boolean(),
  })
  .refine((values) => !values.smsOptIn || values.phone, {
    message: "Add a phone number to turn on text messages",
    path: ["smsOptIn"],
  });
