import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(
      new ApiError(
        401,
        "TOKEN_REQUIRED",
        "Authentication token is required",
      ),
    );
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new ApiError(
        401,
        "INVALID_TOKEN",
        "Invalid authentication token",
      ),
    );
  }

  try {
    const tokenData = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET,
    );

    req.userId = tokenData.userId;

    next();
  } catch (error) {
    return next(
      new ApiError(
        401,
        "INVALID_TOKEN",
        "Invalid or expired authentication token",
      ),
    );
  }
};

export default verifyJWT;