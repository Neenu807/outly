/**
 * Operational error. Signature locked by ARCHITECTURE §29:
 *   (statusCode, code, message, details?)
 *
 * Prefer the `apiError(code, message, details)` factory in utils/errorCodes.js,
 * which derives the status from the registry.
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Distinguishes an error we raised deliberately from one that escaped.
    this.isOperational = true;

    Error.captureStackTrace?.(this, ApiError);
  }
}

export default ApiError;
