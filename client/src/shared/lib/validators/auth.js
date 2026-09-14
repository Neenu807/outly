import { z } from "zod";

/**
 * Client-side mirrors of server/src/validators/auth.validator.js (§21, §33 #5).
 *
 * These exist so a person learns about a mistake before a round trip. They are
 * a courtesy, not a boundary — the server validates everything again.
 */

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "That email is too long");

const byteLength = (value) => new TextEncoder().encode(value).length;

export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((value) => byteLength(value) <= 72, "That's too long — keep it under 72 bytes");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters")
    .max(80, "Keep it under 80 characters"),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
