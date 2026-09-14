import { z } from "zod";

/**
 * Normalised BEFORE the format check, so "  Asha@Example.COM " is stored and
 * looked up as "asha@example.com". Without that, login would be case-sensitive
 * in a way nobody expects of an email address.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please provide a valid email")
  .max(254, "Email is too long");

/**
 * bcrypt only reads the first 72 BYTES of its input and silently ignores the
 * rest — so two long passwords sharing a prefix would both unlock the account.
 * Capping it makes that impossible rather than surprising.
 */
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 bytes",
  );

const linkToken = z.string().trim().min(20, "Invalid link").max(200, "Invalid link");

// z.object strips unknown keys, and validate() REPLACES req.body with the
// result — so role, organizerStatus, isEmailVerified or tokenVersion in a
// request body never reach the service (§21).
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  email,
  password: newPassword,
});

const loginSchema = z.object({
  email,
  // Deliberately not newPassword: login must not reveal password rules, and a
  // bounded length keeps an oversized body off bcrypt.
  password: z.string().min(1, "Password is required").max(1024),
});

const verifyEmailSchema = z.object({ token: linkToken });

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({ token: linkToken, password: newPassword });

// Whether the new password differs from the current one needs the stored hash,
// so that check lives in the service, not here.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(1024),
  newPassword,
});

export {
  email,
  newPassword,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
