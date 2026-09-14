import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

/**
 * Index policy (§13): autoIndex in development so schema changes take effect
 * immediately; never in production, where indexes are built once by a script
 * or through Atlas.
 */
const connectDB = async (uri = env.MONGODB_URI) => {
  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (error) =>
    logger.error({ err: error }, "MongoDB connection error"),
  );

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: !env.isProduction,
    });
  } catch (error) {
    logger.fatal({ err: error }, "MongoDB connection failed — exiting");
    process.exit(1);
  }

  return mongoose.connection;
};

/** Readable state for the health endpoint (§29). */
const dbStatus = () =>
  ({
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  })[mongoose.connection.readyState] ?? "unknown";

export default connectDB;
export { dbStatus };
