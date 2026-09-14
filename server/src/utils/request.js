/**
 * Express 5 made `req.query` a lazy getter on the request prototype, so the
 * usual `req.query = parsed` throws. (This is also why `express-mongo-sanitize`
 * is unusable on Express 5 and why middleware/sanitize.js is hand-rolled.)
 *
 * Defining the property on the request instance shadows the prototype getter
 * and is the supported way to replace it.
 */
const setRequestProperty = (req, key, value) => {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

export { setRequestProperty };
