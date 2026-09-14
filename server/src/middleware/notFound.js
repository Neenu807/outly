import { apiError } from "../utils/errorCodes.js";

/**
 * Unknown route → the standard error envelope, never an HTML stack trace (§29).
 */
const notFound = (req, res, next) => {
  next(apiError("NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
};

export default notFound;
