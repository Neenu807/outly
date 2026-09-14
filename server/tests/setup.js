import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { whenIdle } from "../src/utils/background.js";

/**
 * A real MongoDB, fresh per run (ARCHITECTURE §26). Mocking Mongoose would
 * test the mock rather than the query — and the query is the thing the
 * integrity design depends on.
 */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(mongoServer.getUri(), { autoIndex: true });
});

afterEach(async () => {
  // Let post-response work (emails, the forgot-password lookup) finish first,
  // or it writes into the next test's empty database.
  await whenIdle();

  // Clear between tests so ordering never matters.
  const { collections } = mongoose.connection;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer?.stop();
});
