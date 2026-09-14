import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { migrateOrganizers } from "../scripts/migrateOrganizers.js";
import User from "../src/models/User.js";

/**
 * The §7 migration against documents shaped exactly like the pre-v5.1 ones
 * found in the local database: organizerEnabled and organizerVerified present;
 * tokenVersion, isEmailVerified and organizerStatus absent.
 */

const db = () => mongoose.connection.db;

const insertLegacyUser = async (overrides = {}) => {
  const { insertedId } = await db()
    .collection("users")
    .insertOne({
      name: "Legacy Member",
      email: `legacy-${new mongoose.Types.ObjectId()}@example.com`,
      passwordHash: "$2b$10$legacyhashlegacyhashlegacyhashlegacyhashlegacyha",
      role: "user",
      organizerEnabled: false,
      organizerVerified: false,
      avatarUrl: null,
      interests: [],
      city: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      __v: 0,
      ...overrides,
    });

  return insertedId;
};

const rawUser = (id) => db().collection("users").findOne({ _id: id });

describe("scripts/migrateOrganizers", () => {
  it("reports what it would change and writes nothing on a dry run", async () => {
    const id = await insertLegacyUser();

    const report = await migrateOrganizers(db());

    expect(report).toMatchObject({ scanned: 1, changed: 1, none: 1, applied: false });
    expect(await rawUser(id)).toHaveProperty("organizerEnabled", false);
    expect(await rawUser(id)).not.toHaveProperty("organizerStatus");
  });

  it("maps every legacy account onto organizerStatus and removes the old fields", async () => {
    const member = await insertLegacyUser();

    const legacyOrganizer = await insertLegacyUser({
      role: "organizer",
      organizerEnabled: true,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });

    // Publishing, with no legacy flag set at all — the activity is the evidence.
    const publisher = await insertLegacyUser();
    const firstPublishedAt = new Date("2026-03-15T09:30:00Z");

    await db()
      .collection("activities")
      .insertMany([
        { organizer: publisher, createdAt: new Date("2026-04-01T00:00:00Z") },
        { organizer: publisher, createdAt: firstPublishedAt },
      ]);

    const report = await migrateOrganizers(db(), { apply: true });

    expect(report).toMatchObject({
      scanned: 3,
      changed: 3,
      approved: 2,
      none: 1,
      roleCorrected: 1,
      legacyFieldsRemoved: 3,
      applied: true,
    });

    const migratedMember = await rawUser(member);

    expect(migratedMember).toMatchObject({
      role: "user",
      organizerStatus: "none",
      tokenVersion: 0,
      isEmailVerified: false,
      smsOptIn: false,
    });
    expect(migratedMember).not.toHaveProperty("organizerEnabled");
    expect(migratedMember).not.toHaveProperty("organizerVerified");

    // Nobody silently loses a capability they were already exercising.
    expect(await rawUser(legacyOrganizer)).toMatchObject({
      role: "user",
      organizerStatus: "approved",
      organizerReviewedAt: new Date("2026-02-01T00:00:00Z"),
    });

    expect(await rawUser(publisher)).toMatchObject({
      organizerStatus: "approved",
      organizerReviewedAt: firstPublishedAt,
    });
  });

  it("leaves documents that satisfy the new schema", async () => {
    const ids = [
      await insertLegacyUser(),
      await insertLegacyUser({ role: "organizer", organizerEnabled: true }),
    ];

    await migrateOrganizers(db(), { apply: true });

    for (const id of ids) {
      const doc = await User.findById(id).select("+passwordHash");

      await expect(doc.validate()).resolves.toBeUndefined();
    }
  });

  it("is idempotent", async () => {
    await insertLegacyUser();
    await insertLegacyUser({ role: "organizer", organizerEnabled: true });

    await migrateOrganizers(db(), { apply: true });
    const second = await migrateOrganizers(db(), { apply: true });

    expect(second).toMatchObject({ scanned: 2, changed: 0 });
  });
});
