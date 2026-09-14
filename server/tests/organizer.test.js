import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";

const outbox = vi.hoisted(() => []);

vi.mock("../src/services/external/email.service.js", () => ({
  sendEmail: vi.fn(async (message) => {
    outbox.push(message);
    return { delivered: true };
  }),
}));

import app from "../src/app.js";
import User from "../src/models/User.js";
import { whenIdle } from "../src/utils/background.js";
import { bearer, createUser } from "./helpers.js";

const MESSAGE = "I run weekend pottery workshops for beginners in Kochi.";
const REASON = "Tell us where the workshops will happen.";
const DAY = 24 * 60 * 60 * 1000;

const call = (method, path, user, body) => {
  const req = request(app)[method](`/api/v1${path}`);
  const authed = user ? req.set("Authorization", bearer(user)) : req;

  return body ? authed.send(body) : authed;
};

const asToken = (user, method, path) =>
  request(app)[method](`/api/v1${path}`).set("Authorization", bearer(user));

const verifiedMember = (overrides = {}) => createUser({ isEmailVerified: true, ...overrides });

const admin = (overrides = {}) => verifiedMember({ role: "admin", ...overrides });

const pendingApplicant = (overrides = {}) =>
  verifiedMember({
    organizerStatus: "pending",
    organizerRequest: { message: MESSAGE, requestedAt: new Date() },
    ...overrides,
  });

const rejectedApplicant = (reviewedDaysAgo) =>
  verifiedMember({
    organizerStatus: "rejected",
    organizerRejectionReason: REASON,
    organizerReviewedAt: new Date(Date.now() - reviewedDaysAgo * DAY),
    organizerRequest: {
      message: MESSAGE,
      requestedAt: new Date(Date.now() - (reviewedDaysAgo + 1) * DAY),
    },
  });

const expectError = (response, status, code) => {
  expect(response.status).toBe(status);
  expect(response.body.error.code).toBe(code);
};

beforeEach(() => {
  outbox.length = 0;
});

describe("POST /api/v1/organizer/request", () => {
  it("refuses an unverified member", async () => {
    const member = await createUser();

    expectError(
      await call("post", "/organizer/request", member, { message: MESSAGE }),
      403,
      "EMAIL_NOT_VERIFIED",
    );
  });

  it("opens a pending request that grants nothing", async () => {
    const member = await verifiedMember();

    const response = await call("post", "/organizer/request", member, {
      message: MESSAGE,
      contactLink: "https://instagram.com/kochipottery",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.request).toMatchObject({
      organizerStatus: "pending",
      request: { message: MESSAGE, contactLink: "https://instagram.com/kochipottery" },
      canApply: false,
    });

    const stored = await User.findById(member._id);

    expect(stored.role).toBe("user");
    expect(stored.organizerStatus).toBe("pending");
  });

  it("refuses a second request while one is open", async () => {
    const member = await verifiedMember();

    await call("post", "/organizer/request", member, { message: MESSAGE });

    expectError(
      await call("post", "/organizer/request", member, { message: MESSAGE }),
      409,
      "ORGANIZER_APPLICATION_PENDING",
    );
  });

  it("lets only one of two concurrent requests through", async () => {
    const member = await verifiedMember();

    const responses = await Promise.all([
      call("post", "/organizer/request", member, { message: MESSAGE }),
      call("post", "/organizer/request", member, { message: MESSAGE }),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it.each([
    ["an approved organizer", () => verifiedMember({ organizerStatus: "approved" })],
    ["an admin", () => admin()],
  ])("refuses %s with ALREADY_ORGANIZER", async (_, makeUser) => {
    expectError(
      await call("post", "/organizer/request", await makeUser(), { message: MESSAGE }),
      409,
      "ALREADY_ORGANIZER",
    );
  });

  it("refuses a rejected applicant inside the 30-day cooldown, saying when they may re-apply", async () => {
    const applicant = await rejectedApplicant(10);

    const response = await call("post", "/organizer/request", applicant, { message: MESSAGE });

    expectError(response, 403, "ORGANIZER_APPLICATION_REJECTED");
    expect(response.body.error.details.reason).toBe(REASON);
    expect(new Date(response.body.error.details.canReapplyAt).getTime()).toBe(
      applicant.organizerReviewedAt.getTime() + 30 * DAY,
    );
  });

  it("accepts a rejected applicant once the cooldown has passed", async () => {
    const applicant = await rejectedApplicant(31);

    const response = await call("post", "/organizer/request", applicant, { message: MESSAGE });

    expect(response.status).toBe(201);
    expect(response.body.data.request.organizerStatus).toBe("pending");
  });

  it.each([
    [{ message: "Too short to judge." }, "message"],
    [{ message: MESSAGE, contactLink: "http://example.com/studio" }, "contactLink"],
  ])("rejects %j with details for %s", async (body, field) => {
    const response = await call("post", "/organizer/request", await verifiedMember(), body);

    expectError(response, 400, "VALIDATION_FAILED");
    expect(response.body.error.details[field]).toBeDefined();
  });

  it("treats an empty link field as no link", async () => {
    const response = await call("post", "/organizer/request", await verifiedMember(), {
      message: MESSAGE,
      contactLink: "",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.request.request.contactLink).toBeNull();
  });
});

describe("GET /api/v1/organizer/request", () => {
  it("shows a rejected applicant the reason and when they may re-apply", async () => {
    const applicant = await rejectedApplicant(10);

    const response = await call("get", "/organizer/request", applicant);

    expect(response.status).toBe(200);
    expect(response.body.data.request).toMatchObject({
      organizerStatus: "rejected",
      rejectionReason: REASON,
      canApply: false,
    });
    expect(response.body.data.request.canReapplyAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("requires a session", async () => {
    expect((await call("get", "/organizer/request")).status).toBe(401);
  });
});

describe("the admin organizer-request queue", () => {
  it("is closed to everyone but admins", async () => {
    const target = await pendingApplicant();
    const organizer = await verifiedMember({ organizerStatus: "approved" });

    for (const response of [
      await call("get", "/admin/organizer-requests", organizer),
      await call("patch", `/admin/organizer-requests/${target._id}/approve`, organizer),
      await call("patch", `/admin/organizer-requests/${target._id}/reject`, organizer, {
        reason: REASON,
      }),
    ]) {
      expectError(response, 403, "FORBIDDEN");
    }

    expect((await call("get", "/admin/organizer-requests")).status).toBe(401);
    expect((await User.findById(target._id)).organizerStatus).toBe("pending");
  });

  it("lists pending requests oldest first, with what an admin needs to judge them", async () => {
    const reviewer = await admin();

    const newer = await pendingApplicant({
      organizerRequest: { message: MESSAGE, requestedAt: new Date(Date.now() - DAY) },
    });
    const older = await pendingApplicant({
      city: "Kochi",
      interests: ["pottery"],
      organizerRequest: {
        message: MESSAGE,
        contactLink: "https://example.com/studio",
        requestedAt: new Date(Date.now() - 3 * DAY),
      },
    });
    await verifiedMember();

    const response = await call("get", "/admin/organizer-requests", reviewer);

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.userId)).toEqual([
      String(older._id),
      String(newer._id),
    ]);
    expect(response.body.meta).toEqual({ page: 1, limit: 12, total: 2, totalPages: 1 });
    expect(response.body.data[0]).toMatchObject({
      city: "Kochi",
      interests: ["pottery"],
      isEmailVerified: true,
      request: { message: MESSAGE, contactLink: "https://example.com/studio" },
    });
  });

  it("filters by status and search, escapes the search, and clamps an oversized limit", async () => {
    const reviewer = await admin();

    await pendingApplicant({ name: "Priya Nair" });
    await pendingApplicant({ name: "Rahul Das" });
    await rejectedApplicant(5);

    const search = await call("get", "/admin/organizer-requests?q=priya", reviewer);

    expect(search.body.data.map((item) => item.name)).toEqual(["Priya Nair"]);

    // A regex metacharacter is matched literally, not as "match everything".
    const pattern = await call("get", "/admin/organizer-requests?q=.*", reviewer);

    expect(pattern.body.data).toHaveLength(0);

    const rejected = await call(
      "get",
      "/admin/organizer-requests?status=rejected&limit=999",
      reviewer,
    );

    expect(rejected.body.data).toHaveLength(1);
    expect(rejected.body.meta.limit).toBe(50);
    expect(rejected.body.data[0].review.rejectionReason).toBe(REASON);
  });

  it("approval takes effect on the applicant's next request and emails them", async () => {
    const reviewer = await admin();
    const applicant = await pendingApplicant();

    const response = await call(
      "patch",
      `/admin/organizer-requests/${applicant._id}/approve`,
      reviewer,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.request).toMatchObject({
      organizerStatus: "approved",
      review: { reviewedBy: String(reviewer._id), rejectionReason: null },
    });

    // The applicant's existing token — approval is read per request.
    const me = await asToken(applicant, "get", "/auth/me");

    expect(me.body.data.user.organizerStatus).toBe("approved");

    await whenIdle();

    expect(outbox.at(-1)).toMatchObject({
      to: applicant.email,
      subject: expect.stringMatching(/approved/i),
    });
  });

  it("rejection records and emails the reason, and leaves the member's session untouched", async () => {
    const reviewer = await admin();
    const applicant = await pendingApplicant();

    const response = await call(
      "patch",
      `/admin/organizer-requests/${applicant._id}/reject`,
      reviewer,
      { reason: REASON },
    );

    expect(response.status).toBe(200);
    expect(response.body.data.request.organizerStatus).toBe("rejected");

    const stored = await User.findById(applicant._id);

    // §18: rejection is NOT a tokenVersion event.
    expect(stored.tokenVersion).toBe(applicant.tokenVersion);
    expect(stored.organizerRejectionReason).toBe(REASON);

    expect((await asToken(applicant, "get", "/auth/me")).status).toBe(200);

    const own = await asToken(applicant, "get", "/organizer/request");

    expect(own.body.data.request).toMatchObject({ rejectionReason: REASON, canApply: false });

    await whenIdle();

    expect(outbox.at(-1).to).toBe(applicant.email);
    expect(outbox.at(-1).text).toContain(REASON);
  });

  it("escapes the rejection reason in the email's HTML", async () => {
    const reviewer = await admin();
    const applicant = await pendingApplicant();

    await call("patch", `/admin/organizer-requests/${applicant._id}/reject`, reviewer, {
      reason: "<script>alert('x')</script> is not a venue",
    });

    await whenIdle();

    const { html } = outbox.at(-1);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("requires a reason to reject", async () => {
    const reviewer = await admin();
    const applicant = await pendingApplicant();

    const response = await call(
      "patch",
      `/admin/organizer-requests/${applicant._id}/reject`,
      reviewer,
      { reason: "" },
    );

    expectError(response, 400, "VALIDATION_FAILED");
    expect(response.body.error.details.reason).toBeDefined();
    expect((await User.findById(applicant._id)).organizerStatus).toBe("pending");
  });

  it("cannot decide a request twice, decide an unknown user, or take a malformed id", async () => {
    const reviewer = await admin();
    const applicant = await pendingApplicant();
    const path = `/admin/organizer-requests/${applicant._id}`;

    expect((await call("patch", `${path}/approve`, reviewer)).status).toBe(200);

    expectError(await call("patch", `${path}/approve`, reviewer), 404, "NOT_FOUND");
    expectError(
      await call("patch", `${path}/reject`, reviewer, { reason: REASON }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await call(
        "patch",
        `/admin/organizer-requests/${new mongoose.Types.ObjectId()}/approve`,
        reviewer,
      ),
      404,
      "NOT_FOUND",
    );
    expectError(
      await call("patch", "/admin/organizer-requests/not-an-id/approve", reviewer),
      400,
      "INVALID_ID",
    );
  });

  it("refuses to let an admin decide their own request", async () => {
    const reviewer = await admin({
      organizerStatus: "pending",
      organizerRequest: { message: MESSAGE, requestedAt: new Date() },
    });

    expectError(
      await call("patch", `/admin/organizer-requests/${reviewer._id}/approve`, reviewer),
      403,
      "CANNOT_SELF_MODERATE",
    );
  });
});
