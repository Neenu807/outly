import { apiError } from "../utils/errorCodes.js";

/**
 * Authorization primitives (ARCHITECTURE §18). Each answers exactly one
 * question and none subsumes another:
 *
 *   requireVerified    is this address real
 *   requireOrganizer   may you publish — the capability, not the resource
 *   requireAdmin       are you staff
 *   requireOwnership   may you touch THIS one
 *
 * Composed per route, coarsest first, always after requireAuth. Every guard
 * fails closed: mounted without requireAuth in front of it, it refuses with 401
 * rather than waving the request through.
 *
 * There is no requireApproved. Admin approval gates organizer requests only.
 */

const isAdmin = (user) => user?.role === "admin";

const missingSession = () => apiError("UNAUTHENTICATED", "Authentication required");

/** Booking, booking management, reviewing and the organizer request. */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(missingSession());
  }

  if (req.user.isEmailVerified !== true) {
    return next(
      apiError("EMAIL_NOT_VERIFIED", "Verify your email address to continue"),
    );
  }

  return next();
};

/** `none`, `pending` and `rejected` all land on ORGANIZER_REQUIRED (§20). */
const requireOrganizer = (req, res, next) => {
  if (!req.user) {
    return next(missingSession());
  }

  if (req.user.organizerStatus !== "approved" && !isAdmin(req.user)) {
    return next(
      apiError("ORGANIZER_REQUIRED", "An approved organizer account is required"),
    );
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(missingSession());
  }

  if (!isAdmin(req.user)) {
    return next(apiError("FORBIDDEN", "Administrator access is required"));
  }

  return next();
};

/**
 * `requireOwnership(loadResource, options)`.
 *
 * `loadResource(req)` is a service lookup returning the document (with an
 * `organizer` field) or null — this middleware never touches a model. The
 * loaded document is attached as `req.resource` so the controller does not
 * fetch it twice.
 *
 * `hideExistence` returns the not-found code instead of NOT_OWNER, for
 * resources whose mere existence is private — another organizer's draft (§20).
 *
 * Never a substitute for query scoping: list and dashboard queries still filter
 * on `organizer: req.user._id` at the query itself (§10).
 */
const requireOwnership = (
  loadResource,
  { notFoundCode = "NOT_FOUND", hideExistence = false } = {},
) => {
  if (typeof loadResource !== "function") {
    throw new TypeError("requireOwnership needs a loadResource(req) function");
  }

  return async (req, res, next) => {
    if (!req.user) {
      return next(missingSession());
    }

    let resource;

    try {
      resource = await loadResource(req);
    } catch (error) {
      return next(error);
    }

    if (!resource) {
      return next(apiError(notFoundCode, "Resource not found"));
    }

    // Tolerates both a raw ObjectId and a populated organizer.
    const ownerId = resource.organizer?._id ?? resource.organizer;
    const owns = ownerId != null && String(ownerId) === String(req.user._id);

    if (!owns && !isAdmin(req.user)) {
      return next(
        hideExistence
          ? apiError(notFoundCode, "Resource not found")
          : apiError("NOT_OWNER", "You do not have access to this resource"),
      );
    }

    req.resource = resource;

    return next();
  };
};

export { requireVerified, requireOrganizer, requireAdmin, requireOwnership };
