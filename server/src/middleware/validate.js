import { apiError } from "../utils/errorCodes.js";
import { setRequestProperty } from "../utils/request.js";

/**
 * Generic validator (ARCHITECTURE §21, §29): `validate(schema, source)`.
 *
 * It REPLACES `req[source]` with the parsed result rather than merging it.
 * That replacement is the point — it strips unknown keys, which is how
 * `role: 'admin'`, `organizerStatus: 'approved'`, `status: 'published'` or
 * `ratingAvg: 5` in a request body get dropped before they can reach the
 * database. Mass assignment is closed by the shape of this middleware, not by
 * remembering to check for it.
 */
const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // §20: `details` is field-keyed.
      const details = {};

      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_";

        if (!details[key]) {
          details[key] = issue.message;
        }
      }

      return next(
        apiError("VALIDATION_FAILED", "Request validation failed", details),
      );
    }

    setRequestProperty(req, source, result.data);

    return next();
  };

export default validate;
