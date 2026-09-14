import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

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
