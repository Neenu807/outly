/**
 * The single query-key factory (ARCHITECTURE §22).
 *
 * No component writes a key by hand. Without this, every feature invents its
 * own shape and invalidation becomes guesswork.
 *
 * Keys are hierarchical, so `queryKeys.activities.all` invalidates every
 * activity query beneath it.
 */
const queryKeys = {
  health: ["health"],

  auth: {
    me: ["auth", "me"],
  },

  activities: {
    all: ["activities"],
    list: (filters) => ["activities", "list", filters],
    detail: (id) => ["activities", "detail", id],
    reviews: (id) => ["activities", "detail", id, "reviews"],
  },

  discover: {
    all: ["discover"],
    results: (context) => ["discover", context],
    explain: (sortedIds) => ["discover", "explain", sortedIds],
  },

  categories: ["categories"],

  bookings: {
    all: ["bookings"],
    me: (scope) => ["bookings", "me", scope],
  },

  organizer: {
    all: ["organizer"],
    activities: (status) => ["organizer", "activities", status],
    activityBookings: (id) => ["organizer", "activities", id, "bookings"],
    dashboard: (range) => ["organizer", "dashboard", range],
    request: ["organizer", "request"],
  },

  admin: {
    all: ["admin"],
    users: (filters) => ["admin", "users", filters],
    organizerRequests: (filters) => ["admin", "organizerRequests", filters],
    dashboard: ["admin", "dashboard"],
  },
};

export default queryKeys;
