import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import { ROLES } from "../src/models/User.js";

/**
 * One-time migration onto the v5.1 organizer model (ARCHITECTURE §7).
 *
 *   node scripts/migrateOrganizers.js            dry run — reports, writes nothing
 *   node scripts/migrateOrganizers.js --apply    writes
 *
 * - every existing user → organizerStatus 'none'
 * - every user who was already publishing → 'approved', with
 *   organizerReviewedAt set to their first activity's createdAt so the audit
 *   trail is not empty (falling back to the account's own createdAt)
 * - a legacy role 'organizer' becomes role 'user' — organizer is a capability,
 *   never a role (D1)
 * - organizerEnabled, organizerVerified and approvalStatus are removed
 * - tokenVersion, isEmailVerified and smsOptIn are filled where absent
 *
 * Nobody is locked out and nobody silently loses a capability they were already
 * exercising. Existing accounts start unverified, which is correct under v5:
 * verification is what gates booking, not account age.
 *
 * Idempotent: a second run finds nothing to change. It writes through the raw
 * collection because the legacy documents do not satisfy the new schema, and
 * the point of the script is to make them.
 */

const LEGACY_FIELDS = ["organizerEnabled", "organizerVerified", "approvalStatus"];

const DEFAULTS = Object.freeze({
  tokenVersion: 0,
  isEmailVerified: false,
  smsOptIn: false,
});

const firstActivityByOrganizer = async (db) => {
  const [activities] = await db
    .listCollections({ name: "activities" }, { nameOnly: true })
    .toArray();

  if (!activities) {
    return new Map();
  }

  const rows = await db
    .collection("activities")
    .aggregate([
      { $match: { organizer: { $ne: null } } },
      { $group: { _id: "$organizer", first: { $min: "$createdAt" } } },
    ])
    .toArray();

  return new Map(rows.map((row) => [String(row._id), row.first]));
};

const migrateOrganizers = async (db, { apply = false } = {}) => {
  const firstActivityAt = await firstActivityByOrganizer(db);

  const report = {
    scanned: 0,
    changed: 0,
    approved: 0,
    none: 0,
    roleCorrected: 0,
    legacyFieldsRemoved: 0,
    applied: apply,
  };

  const operations = [];

  const cursor = db
    .collection("users")
    .find({}, { projection: { passwordHash: 0 } });

  for await (const user of cursor) {
    report.scanned += 1;

    const $set = {};
    const $unset = {};

    if (user.organizerStatus === undefined) {
      const publishedAt = firstActivityAt.get(String(user._id));
      const wasPublishing =
        publishedAt !== undefined ||
        user.organizerEnabled === true ||
        user.role === "organizer";

      if (wasPublishing) {
        $set.organizerStatus = "approved";
        $set.organizerReviewedAt = publishedAt ?? user.createdAt ?? new Date();
        report.approved += 1;
      } else {
        $set.organizerStatus = "none";
        report.none += 1;
      }
    }

    if (!ROLES.includes(user.role)) {
      $set.role = "user";
      report.roleCorrected += 1;
    }

    const legacy = LEGACY_FIELDS.filter((field) => Object.hasOwn(user, field));

    if (legacy.length > 0) {
      for (const field of legacy) {
        $unset[field] = "";
      }

      report.legacyFieldsRemoved += 1;
    }

    for (const [field, value] of Object.entries(DEFAULTS)) {
      if (user[field] === undefined) {
        $set[field] = value;
      }
    }

    const update = {};

    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    if (Object.keys(update).length > 0) {
      operations.push({ updateOne: { filter: { _id: user._id }, update } });
    }
  }

  report.changed = operations.length;

  if (apply && operations.length > 0) {
    await db.collection("users").bulkWrite(operations, { ordered: true });
  }

  return report;
};

const runFromCli = async () => {
  const apply = process.argv.includes("--apply");

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    const report = await migrateOrganizers(mongoose.connection.db, { apply });

    console.log(
      apply
        ? "\nMigration applied.\n"
        : "\nDry run — nothing was written. Re-run with --apply to write.\n",
    );
    console.table(report);
  } finally {
    await mongoose.disconnect();
  }
};

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runFromCli().catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  });
}

export { migrateOrganizers };
