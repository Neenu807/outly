import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import { apiError } from "../utils/errorCodes.js";

/**
 * The single terminal error handler (ARCHITECTURE §23).
 *
 * Translates framework and driver errors into the frozen registry, logs
 * everything with the request id, and returns the real message only for
 * operational errors — anything else gets one generic INTERNAL message, with
 * the detail going to the logs alone.
 */

const translate = (err) => {
  if (err instanceof ApiError) {
    return err;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, issue]) => [field, issue.message]),
    );

    return apiError("VALIDATION_FAILED", "Request validation failed", details);
  }

  if (err instanceof mongoose.Error.CastError) {
    // Never surface a raw CastError — §20.
    return apiError("INVALID_ID", `Invalid value for "${err.path}"`);
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0];

    if (field === "email") {
      return apiError("EMAIL_IN_USE", "An account with this email already exists");
    }

    // Every other unique index in this codebase (bookingReference,
    // {user,activity} on bookings and reviews) is handled in its own service,
    // where the compensating rollback lives (§8 step 6). Reaching here means a
    // service forgot a constraint it knows about, so it is a bug, not a 409.
    return apiError("INTERNAL", "Duplicate key error");
  }

  if (err instanceof jwt.TokenExpiredError || err instanceof jwt.JsonWebTokenError) {
    return apiError("UNAUTHENTICATED", "Invalid or expired authentication token");
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return apiError("VALIDATION_FAILED", "Uploaded file is too large", {
      file: "File exceeds the maximum allowed size",
    });
  }

  if (err?.type === "entity.too.large") {
    return apiError("VALIDATION_FAILED", "Request body is too large");
  }

  return apiError("INTERNAL", "Something went wrong");
};

// Express identifies the terminal handler by arity, so the fourth parameter
// must stay even though it is never called.
const errorHandler = (err, req, res, _next) => {
  const error = translate(err);

  const context = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    code: error.code,
    statusCode: error.statusCode,
  };

  if (error.statusCode >= 500) {
    // Only a server fault earns the full error and its stack.
    logger.error({ ...context, err }, "Unhandled error");
  } else {
    // A 4xx is the API working as designed — a wrong password, a stale
    // session, a bad link. Its stack says nothing, and an anonymous visitor's
    // session bootstrap produces two of them on every page load.
    logger.warn(context, error.message);
  }

  const body = {
    success: false,
    error: {
      code: error.code,
      // An operational error's message is written for a client. Anything else
      // gets a generic one so an internal detail never leaks.
      message: error.isOperational ? error.message : "Something went wrong",
    },
  };

  if (error.details) {
    body.error.details = error.details;
  }

  // Stack traces are a development affordance only — never in production (§29).
  if (!env.isProduction && error.statusCode >= 500) {
    body.error.stack = err.stack;
  }

  return res.status(error.statusCode).json(body);
};

export default errorHandler;
