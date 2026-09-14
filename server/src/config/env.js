import "dotenv/config";
import { z } from "zod";

/**
 * The single place `process.env` is read (ARCHITECTURE §23).
 *
 * Every variable in §27 appears here so the shape is locked from Phase 0.
 * Variables belonging to a later phase are optional with a safe default, so a
 * missing credential yields a degraded-but-working app rather than a crash
 * loop — but `AI_ENABLED=true` without an AI key IS a crash, because that is a
 * misconfiguration rather than an absence.
 */

const bool = (fallback) =>
  z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true"));

const csv = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const envSchema = z
  .object({
    // ---- server core -----------------------------------------------------
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

    // ---- auth ------------------------------------------------------------
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    JWT_REFRESH_EXPIRES: z.string().default("7d"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    // ---- cors / cookies --------------------------------------------------
    CLIENT_URL: z.string().url().default("http://localhost:5173"),
    CORS_ORIGINS: csv,
    COOKIE_SECURE: bool(false),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

    // ---- email (Phase 1 transport, Phase 6 notifications) ----------------
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("Outly <no-reply@outly.app>"),

    // ---- cloudinary (Phase 4) -------------------------------------------
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default("outly"),

    // ---- ai provider (Phase 5) ------------------------------------------
    AI_ENABLED: bool(false),
    AI_API_KEY: z.string().optional(),
    AI_BASE_URL: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_MAX_TOKENS: z.coerce.number().int().positive().default(300),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    AI_DAILY_CALL_CAP: z.coerce.number().int().positive().default(500),

    // ---- twilio (Phase 6) ------------------------------------------------
    SMS_ENABLED: bool(false),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    SMS_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    SMS_DAILY_CAP_PER_USER: z.coerce.number().int().positive().default(10),

    // ---- limits / logging ------------------------------------------------
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message:
          "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET — a leaked access secret must not be able to mint refresh tokens",
      });
    }

    if (env.AI_ENABLED) {
      for (const key of ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"]) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when AI_ENABLED=true`,
          });
        }
      }
    }

    if (env.SMS_ENABLED) {
      for (const key of [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
      ]) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when SMS_ENABLED=true`,
          });
        }
      }
    }

    // Cross-site refresh cookies require Secure; browsers reject SameSite=None
    // without it. This fails only in production, which is why it is checked here.
    if (env.COOKIE_SAMESITE === "none" && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message:
          "COOKIE_SECURE must be true when COOKIE_SAMESITE=none — browsers reject the cookie otherwise",
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  console.error(
    `\nInvalid environment configuration:\n\n${details}\n\nCheck server/.env against server/.env.example.\n`,
  );

  process.exit(1);
}

const env = Object.freeze({
  ...result.data,
  // Derived once so no caller has to repeat the comparison.
  isProduction: result.data.NODE_ENV === "production",
  isTest: result.data.NODE_ENV === "test",
  // CORS_ORIGINS is authoritative when set, so removing an origin from it
  // actually blocks that origin (§29 exit checklist). CLIENT_URL is the
  // single-origin convenience default for local development.
  corsOrigins: Object.freeze(
    result.data.CORS_ORIGINS.length
      ? [...new Set(result.data.CORS_ORIGINS)]
      : [result.data.CLIENT_URL],
  ),
});

export default env;
