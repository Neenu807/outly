import { verifyAccessToken } from "../utils/jwt.js";
import { apiError } from "../utils/errorCodes.js";

// NOTE (Step B): this becomes the full `requireAuth` from §18 — loading the
// user, comparing `tokenVersion`, and attaching `req.user`. It currently only
// verifies the signature and attaches `req.userId`.

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(apiError("UNAUTHENTICATED", "Authentication required"));
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(apiError("UNAUTHENTICATED", "Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);

    req.userId = payload.userId;

    return next();
  } catch {
    return next(
      apiError("UNAUTHENTICATED", "Invalid or expired authentication token"),
    );
  }
};

export default verifyJWT;
