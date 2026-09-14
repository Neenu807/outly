import ApiError from "./ApiError.js";

/**
 * The frozen error registry (ARCHITECTURE §20).
 *
 * Codes are ADDED TO THIS FILE, never invented at a call site. Each code maps
 * to exactly one HTTP status, so a status is never chosen by hand either.
 *
 * §20 defines 25 domain codes. Two further codes are deliberate additions,
 * recorded here rather than smuggled in:
 *
 *   NOT_FOUND  — transport-level: an unknown route. §29 requires the 404
 *                handler to return the standard envelope, and overloading
 *                ACTIVITY_NOT_FOUND for a mistyped URL would be a lie.
 *   FORBIDDEN  — named explicitly by §18 (`requireAdmin → 403 FORBIDDEN`) but
 *                omitted from the §20 table. This resolves that gap in favour
 *                of §18, which is the authorization authority.
 */
const ERROR_CODES = Object.freeze({
  // 400
  VALIDATION_FAILED: 400,
  INVALID_ID: 400,

  // 401
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,

  // 403
  EMAIL_NOT_VERIFIED: 403,
  ORGANIZER_APPLICATION_REJECTED: 403,
  ORGANIZER_REQUIRED: 403,
  NOT_OWNER: 403,
  CANNOT_SELF_MODERATE: 403,
  NOT_ATTENDED: 403,
  FORBIDDEN: 403,

  // 404
  ACTIVITY_NOT_FOUND: 404,
  NOT_FOUND: 404,

  // 409
  EMAIL_IN_USE: 409,
  SOLD_OUT: 409,
  ACTIVITY_UNAVAILABLE: 409,
  ALREADY_BOOKED: 409,
  ALREADY_REVIEWED: 409,
  CAPACITY_BELOW_BOOKED: 409,
  ORGANIZER_APPLICATION_PENDING: 409,
  ALREADY_ORGANIZER: 409,

  // 422
  BOOKING_CLOSED: 422,
  CANNOT_CANCEL: 422,
  REVIEW_WINDOW_CLOSED: 422,
  PAID_NOT_SUPPORTED: 422,

  // 429
  RATE_LIMITED: 429,

  // 500
  INTERNAL: 500,
});

/**
 * Build an ApiError from a registry code. The status comes from the registry,
 * which is what makes "never invent a code inline" the path of least
 * resistance rather than a rule to remember.
 */
const apiError = (code, message, details) => {
  const status = ERROR_CODES[code];

  if (!status) {
    throw new Error(
      `Unknown error code "${code}". Add it to utils/errorCodes.js — never inline.`,
    );
  }

  return new ApiError(status, code, message, details);
};

export default ERROR_CODES;
export { apiError };
