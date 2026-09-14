import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import env from "../config/env.js";
import ERROR_CODES from "../utils/errorCodes.js";

/**
 * Rate limiters (ARCHITECTURE §18).
 *
 * Every limiter returns the standard error envelope with RATE_LIMITED rather
 * than express-rate-limit's default plain-text body, so a throttled client
 * parses the same shape as every other error.
 *
 * All limiters are disabled under NODE_ENV=test — otherwise a suite that makes
 * six login attempts starts failing for a reason that has nothing to do with
 * what it is testing.
 */

const MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * MINUTE;
const HOUR = 60 * MINUTE;

const handler = (req, res) =>
  res.status(ERROR_CODES.RATE_LIMITED).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests — please try again later",
    },
  });

const build = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    handler,
    ...options,
  });

/** 100 / 15 min per IP — the blanket limit. */
const globalLimiter = build({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** 5 / 15 min per IP — login and register. */
const authLimiter = build({ windowMs: FIFTEEN_MINUTES, limit: 5 });

/** 20 / 15 min per IP — token refresh. */
const refreshLimiter = build({ windowMs: FIFTEEN_MINUTES, limit: 20 });

/** 3 / hour per IP — forgot password. */
const forgotPasswordLimiter = build({ windowMs: HOUR, limit: 3 });

/**
 * 5 / hour per IP — the organizer request. The 30-day cooldown (§7) is the real
 * control; this only stops hammering.
 */
const organizerRequestLimiter = build({ windowMs: HOUR, limit: 5 });

/**
 * Per-account limiter factory for the routes §18 scopes by account rather than
 * by IP. Mount it AFTER requireAuth, which is what puts `req.user` there.
 *
 * The IP fallback goes through `ipKeyGenerator(ip)`, which collapses an IPv6
 * address to its /56 subnet — without it, one IPv6 client could rotate through
 * addresses and never be limited.
 */
const perUserLimiter = ({ windowMs, limit }) =>
  build({
    windowMs,
    limit,
    keyGenerator: (req) =>
      req.user?._id ? `user:${req.user._id}` : ipKeyGenerator(req.ip),
  });

/** 3 / hour per account — resend verification. */
const resendVerificationLimiter = perUserLimiter({ windowMs: HOUR, limit: 3 });

/**
 * 5 / 15 min per account — password change. Keyed by account rather than IP:
 * the threat is a stolen access token being used to guess the current password.
 */
const passwordChangeLimiter = perUserLimiter({ windowMs: FIFTEEN_MINUTES, limit: 5 });

/** 300 / 15 min per admin. */
const adminLimiter = perUserLimiter({ windowMs: FIFTEEN_MINUTES, limit: 300 });

export {
  globalLimiter,
  authLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  organizerRequestLimiter,
  perUserLimiter,
  resendVerificationLimiter,
  passwordChangeLimiter,
  adminLimiter,
};
