/**
 * Error code → the copy a person reads (ARCHITECTURE §20).
 *
 * The server's message is written for a developer; the client decides what a
 * user sees, and it decides it in exactly one place. Every code in the §20
 * registry is seeded here so no screen ever renders a raw code.
 *
 * The WORDING belongs to the UI/UX track (§3), not to the architecture — these
 * are serviceable placeholders, deliberately replaceable.
 */
const ERROR_MESSAGES = {
  VALIDATION_FAILED: "Please check the highlighted fields and try again.",
  INVALID_ID: "That link doesn't look right.",

  INVALID_CREDENTIALS: "That email or password isn't right.",
  UNAUTHENTICATED: "Please sign in to continue.",

  EMAIL_NOT_VERIFIED: "Verify your email address to continue.",
  ORGANIZER_APPLICATION_REJECTED:
    "Your organizer request wasn't approved. You can apply again later.",
  ORGANIZER_REQUIRED: "You need an approved organizer account to do that.",
  NOT_OWNER: "This isn't yours to change.",
  CANNOT_SELF_MODERATE: "You can't review your own request.",
  NOT_ATTENDED: "You can only review activities you've attended.",
  FORBIDDEN: "You don't have access to that.",

  ACTIVITY_NOT_FOUND: "We couldn't find that activity.",
  NOT_FOUND: "We couldn't find that page.",

  EMAIL_IN_USE: "An account with that email already exists.",
  SOLD_OUT: "This one just filled up.",
  ACTIVITY_UNAVAILABLE: "This activity isn't taking bookings.",
  ALREADY_BOOKED: "You've already booked this one.",
  ALREADY_REVIEWED: "You've already reviewed this activity.",
  CAPACITY_BELOW_BOOKED: "Capacity can't be lower than the seats already booked.",
  ORGANIZER_APPLICATION_PENDING: "Your request is already under review.",
  ALREADY_ORGANIZER: "You're already an approved organizer.",

  BOOKING_CLOSED: "Bookings for this activity have closed.",
  CANNOT_CANCEL: "This booking can no longer be cancelled.",
  REVIEW_WINDOW_CLOSED: "Reviews can only be edited within 7 days.",
  PAID_NOT_SUPPORTED: "Paid activities aren't supported yet.",

  RATE_LIMITED: "Too many attempts — give it a moment and try again.",
  INTERNAL: "Something went wrong on our end. Please try again.",
};

const FALLBACK = "Something went wrong. Please try again.";

/**
 * Resolves an axios error into user-facing copy. A network failure has no
 * response and no code, which is a distinct case worth its own sentence.
 */
const getErrorMessage = (error) => {
  if (!error) {
    return FALLBACK;
  }

  const code = error?.response?.data?.error?.code;

  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  if (!error.response) {
    return "Can't reach the server. Check your connection and try again.";
  }

  return FALLBACK;
};

export default ERROR_MESSAGES;
export { getErrorMessage };
