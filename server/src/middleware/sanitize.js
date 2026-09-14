import { setRequestProperty } from "../utils/request.js";

/**
 * Strips MongoDB operator injection from request input (ARCHITECTURE §21).
 *
 * Hand-rolled because `express-mongo-sanitize` mutates `req.query` in place and
 * Express 5 made that a getter — the package throws on this version. This is
 * the same ten lines without the incompatibility.
 *
 * Keys beginning with `$` or containing `.` are removed, so `?sort[$where]=`
 * and `?price[$gt]=` cannot reach a query.
 */
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const scrub = (value) => {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const clean = {};

  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }

    clean[key] = scrub(entry);
  }

  return clean;
};

const sanitize = (req, res, next) => {
  for (const source of ["body", "query", "params"]) {
    const value = req[source];

    if (value && typeof value === "object") {
      setRequestProperty(req, source, scrub(value));
    }
  }

  next();
};

export default sanitize;
