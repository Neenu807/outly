import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { optionalAuth, requireAuth } from "../src/middleware/auth.js";
import {
  requireAdmin,
  requireOrganizer,
  requireOwnership,
  requireVerified,
} from "../src/middleware/authorize.js";
import errorHandler from "../src/middleware/error.js";
import User from "../src/models/User.js";
import { bearer, createUser } from "./helpers.js";

/**
 * The §18 primitives, exercised by calling the API directly with real tokens —
 * never through a UI. This is §26's bypass-resistance set: the frontend is not
 * in the test path, which is what proves the server is the boundary.
 *
 * They run on a probe app because no production route mounts these guards
 * until the organizer request (Step C) and activity writes (Phase 4). The
 * guards are what is under test here, not the routes.
 */

const echo = (req, res) =>
  res.json({ success: true, data: { userId: req.user ? String(req.user._id) : null } });

// Stands in for a service lookup such as activity.service's findById.
const resources = new Map();
const loadResource = async (req) => resources.get(req.params.id) ?? null;

const probe = express();

probe.get("/verified", requireAuth, requireVerified, echo);
probe.get("/organizer", requireAuth, requireVerified, requireOrganizer, echo);
probe.get("/admin", requireAuth, requireAdmin, echo);
probe.get(
  "/owned/:id",
  requireAuth,
  requireVerified,
  requireOrganizer,
  requireOwnership(loadResource, { notFoundCode: "ACTIVITY_NOT_FOUND" }),
  echo,
);
probe.get(
  "/private/:id",
  requireAuth,
  requireVerified,
  requireOrganizer,
  requireOwnership(loadResource, { notFoundCode: "ACTIVITY_NOT_FOUND", hideExistence: true }),
  echo,
);
probe.get("/optional", optionalAuth, echo);
probe.get("/misconfigured", requireVerified, echo);
probe.use(errorHandler);

const call = (path, user) => {
  const req = request(probe).get(path);

  return user ? req.set("Authorization", bearer(user)) : req;
};

const expectRefusal = (response, status, code) => {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
};

const persona = {
  unverified: () => createUser(),
  verified: () => createUser({ isEmailVerified: true }),
  pending: () => createUser({ isEmailVerified: true, organizerStatus: "pending" }),
  rejected: () =>
    createUser({
      isEmailVerified: true,
      organizerStatus: "rejected",
      organizerRejectionReason: "Tell us more about what you plan to run.",
    }),
  organizer: () => createUser({ isEmailVerified: true, organizerStatus: "approved" }),
  admin: () => createUser({ isEmailVerified: true, role: "admin" }),
};

describe("requireVerified", () => {
  it("refuses an unverified account with EMAIL_NOT_VERIFIED", async () => {
    expectRefusal(await call("/verified", await persona.unverified()), 403, "EMAIL_NOT_VERIFIED");
  });

  it("admits a verified member", async () => {
    expect((await call("/verified", await persona.verified())).status).toBe(200);
  });

  it("admits the same token as soon as the email is verified — no re-login", async () => {
    const user = await persona.unverified();
    const token = bearer(user);

    await User.updateOne({ _id: user._id }, { isEmailVerified: true });

    const response = await request(probe).get("/verified").set("Authorization", token);

    expect(response.status).toBe(200);
  });

  it.each(["pending", "rejected"])(
    "leaves a %s applicant with full member access",
    async (status) => {
      // Applying and being refused costs a member nothing (§18, read by column).
      expect((await call("/verified", await persona[status]())).status).toBe(200);
    },
  );
});

describe("requireOrganizer", () => {
  it.each(["verified", "pending", "rejected"])(
    "refuses a %s account with ORGANIZER_REQUIRED",
    async (name) => {
      expectRefusal(await call("/organizer", await persona[name]()), 403, "ORGANIZER_REQUIRED");
    },
  );

  it("admits an approved organizer", async () => {
    expect((await call("/organizer", await persona.organizer())).status).toBe(200);
  });

  it("admits an admin whose organizerStatus is none", async () => {
    expect((await call("/organizer", await persona.admin())).status).toBe(200);
  });

  it("takes effect on the next request after approval", async () => {
    const user = await persona.pending();
    const token = bearer(user);

    await User.updateOne({ _id: user._id }, { organizerStatus: "approved" });

    const response = await request(probe).get("/organizer").set("Authorization", token);

    expect(response.status).toBe(200);
  });
});

describe("requireAdmin", () => {
  it.each(["verified", "organizer"])("refuses a %s account with FORBIDDEN", async (name) => {
    expectRefusal(await call("/admin", await persona[name]()), 403, "FORBIDDEN");
  });

  it("admits an admin", async () => {
    expect((await call("/admin", await persona.admin())).status).toBe(200);
  });
});

describe("requireOwnership", () => {
  it("admits the owning organizer", async () => {
    const owner = await persona.organizer();
    resources.set("a1", { organizer: owner._id });

    expect((await call("/owned/a1", owner)).status).toBe(200);
  });

  it("refuses another approved organizer with NOT_OWNER", async () => {
    // requireOrganizer says "may edit activities"; only this says "may edit
    // THIS one". The test people forget.
    const owner = await persona.organizer();
    const rival = await persona.organizer();
    resources.set("a2", { organizer: owner._id });

    expectRefusal(await call("/owned/a2", rival), 403, "NOT_OWNER");
  });

  it("admits an admin who does not own the resource", async () => {
    const owner = await persona.organizer();
    resources.set("a3", { organizer: owner._id });

    expect((await call("/owned/a3", await persona.admin())).status).toBe(200);
  });

  it("accepts a populated organizer as well as a raw id", async () => {
    const owner = await persona.organizer();
    resources.set("a4", { organizer: { _id: owner._id, name: owner.name } });

    expect((await call("/owned/a4", owner)).status).toBe(200);
  });

  it("answers a missing resource with its not-found code", async () => {
    expectRefusal(
      await call("/owned/nope", await persona.organizer()),
      404,
      "ACTIVITY_NOT_FOUND",
    );
  });

  it("hides existence from a non-owner when asked to", async () => {
    const owner = await persona.organizer();
    const rival = await persona.organizer();
    resources.set("draft", { organizer: owner._id });

    expectRefusal(await call("/private/draft", rival), 404, "ACTIVITY_NOT_FOUND");
  });
});

describe("optionalAuth", () => {
  it("treats a request without a token as anonymous", async () => {
    const response = await call("/optional");

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBeNull();
  });

  it("attaches the user for a valid token", async () => {
    const user = await persona.verified();

    const response = await call("/optional", user);

    expect(response.body.data.userId).toBe(String(user._id));
  });

  it("treats a revoked token as anonymous rather than blocking browsing", async () => {
    const user = await persona.verified();
    const token = bearer(user);

    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

    const response = await request(probe).get("/optional").set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBeNull();
  });
});

describe("guards fail closed", () => {
  it("refuses with 401 when mounted without requireAuth in front", async () => {
    const user = await persona.verified();

    expectRefusal(await call("/misconfigured", user), 401, "UNAUTHENTICATED");
  });
});
