import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import env from "../src/config/env.js";
import User from "../src/models/User.js";
import { email as emailSchema } from "../src/validators/auth.validator.js";

/**
 * Creates an administrator (ARCHITECTURE §18, §23).
 *
 *   npm run create-admin -- --email ops@example.com --name "Ops Admin"
 *
 * Admins are created with isEmailVerified: true, which is why /admin routes need
 * no verification guard.
 *
 * No password is accepted as an argument — it would end up in shell history.
 * A strong random one is generated and printed ONCE; change it with
 * forgot-password. An existing account is promoted in place and its password is
 * left untouched.
 */
const createAdmin = async ({ email, name = "Outly Admin" }) => {
  const address = emailSchema.parse(email);
  const existing = await User.findOne({ email: address });

  if (existing) {
    if (existing.role === "admin" && existing.isEmailVerified) {
      return { action: "unchanged", email: address, password: null };
    }

    await User.updateOne(
      { _id: existing._id },
      { $set: { role: "admin", isEmailVerified: true } },
    );

    return { action: "promoted", email: address, password: null };
  }

  const password = crypto.randomBytes(18).toString("base64url");

  await User.create({
    name,
    email: address,
    passwordHash: await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
    role: "admin",
    isEmailVerified: true,
  });

  return { action: "created", email: address, password };
};

const runFromCli = async () => {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });

  if (!values.email) {
    console.error('Usage: npm run create-admin -- --email you@example.com [--name "Your Name"]');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    const result = await createAdmin(values);

    if (result.action === "created") {
      console.log(`\nAdmin created: ${result.email}`);
      console.log(`Temporary password (shown once): ${result.password}`);
      console.log("Change it now via Forgot password.\n");
    } else if (result.action === "promoted") {
      console.log(`\n${result.email} promoted to admin. Password unchanged.\n`);
    } else {
      console.log(`\n${result.email} is already a verified admin. Nothing changed.\n`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

/**
 * A Zod failure puts the whole issue array in `error.message` as JSON, which
 * fills the terminal with a stack of braces for something as ordinary as a
 * mistyped email. Only the messages are worth reading.
 */
const describe = (error) =>
  Array.isArray(error?.issues)
    ? error.issues.map((issue) => issue.message).join("; ")
    : (error?.message ?? String(error));

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runFromCli().catch((error) => {
    console.error(`create-admin failed: ${describe(error)}`);
    process.exitCode = 1;
  });
}

export { createAdmin };
