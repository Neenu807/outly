import ApiError from "../utils/ApiError.js";
import { apiError } from "../utils/errorCodes.js";
import { authenticateAccessToken } from "../services/auth.service.js";

/**
 * Authentication — "who are you" (ARCHITECTURE §18).
 *
 * Both middlewares attach a live, database-loaded `req.user`. Nothing about the
 * user's standing is taken from the token beyond its id and tokenVersion.
 */

const readBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  return scheme === "Bearer" && token ? token : null;
};

/** Valid access token · user exists · tokenVersion matches → 401 otherwise. */
const requireAuth = async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return next(apiError("UNAUTHENTICATED", "Authentication required"));
  }

  let user;

  try {
    user = await authenticateAccessToken(token);
  } catch (error) {
    return next(error);
  }

  req.user = user;

  return next();
};

/**
 * For public routes that personalise when they can: browse, discovery,
 * activity detail (§18, "optional auth for personalisation").
 *
 * An absent, expired or revoked token means anonymous — never a 401 — because
 * a stale session must not stop anyone browsing. A database failure is a
 * different thing and still propagates; it is not "anonymous".
 */
const optionalAuth = async (req, res, next) => {
  req.user = null;

  const token = readBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    req.user = await authenticateAccessToken(token);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return next(error);
    }
  }

  return next();
};

export { requireAuth, optionalAuth };
