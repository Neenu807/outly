import mongoose from "mongoose";
import env from "../src/config/env.js";
import User from "../src/models/User.js";

/**
 * Builds every schema index (ARCHITECTURE §13).
 *
 *   npm run create-indexes
 *
 * `autoIndex` is off in production, so this runs once per deploy that adds an
 * index — before the first deploy most importantly, or the unique email index
 * does not exist and duplicate accounts become possible.
 *
 * `createIndexes()` only ever adds. Unlike `syncIndexes()`, it never drops an
 * index it doesn't recognise, so it is safe to run against a live database.
 */

// Category, Activity, Booking and Review join as their phases land.
const MODELS = [User];

try {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });

  for (const Model of MODELS) {
    await Model.createIndexes();

    const indexes = await Model.listIndexes();

    console.log(`${Model.modelName}: ${indexes.map((index) => JSON.stringify(index.key)).join("  ")}`);
  }
} catch (error) {
  console.error("create-indexes failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
