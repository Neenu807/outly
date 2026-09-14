import env from "./config/env.js";
import logger from "./config/logger.js";
import connectDB from "./config/db.js";
import app from "./app.js";
import mongoose from "mongoose";

/**
 * Connects the database, starts scheduled jobs (Phase 3's completion job) and
 * listens. Everything process-level lives here; app.js stays importable.
 */
const start = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(
      `Outly API listening on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);

    server.close(async () => {
      await mongoose.connection.close(false);
      logger.info("Shutdown complete");
      process.exit(0);
    });

    // Don't let a hung connection hold the process open forever.
    setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled promise rejection — exiting");
    shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (error) => {
    // The process is in an undefined state here; log and die rather than
    // continue serving requests from a corrupted runtime.
    logger.fatal({ err: error }, "Uncaught exception — exiting");
    process.exit(1);
  });
};

start();
