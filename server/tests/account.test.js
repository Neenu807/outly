import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// No test ever contacts an SMTP server (§26): the transport is replaced at the
// services/external boundary, and every message lands in this outbox.
const outbox = vi.hoisted(() => []);

vi.mock("../src/services/external/email.service.js", () => ({
  sendEmail: vi.fn(async (message) => {
    outbox.push(message);
    return { delivered: true };
  }),
}));

import app from "../src/app.js";
import User from "../src/models/User.js";
import { sendEmail } from "../src/services/external/email.service.js";
import { whenIdle } from "../src/utils/background.js";
import { PASSWORD, bearer, createUser } from "./helpers.js";

const MESSAGE = "I run weekend pottery workshops for beginners in Kochi.";

const post = (path, body, authorization) => {
  const req = request(app).post(`/api/v1${path}`);
  const authed = authorization ? req.set("Authorization", authorization) : req;

  return authed.send(body ?? {});
};

const getMe = (authorization) =>
  request(app).get("/api/v1/auth/me").set("Authorization", authorization);

const refreshWith = (cookie) => request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);

const refreshCookieFrom = (response) =>
  response.headers["set-cookie"]
    ?.find((cookie) => cookie.startsWith("refreshToken="))
    ?.split(";")[0];

/** Waits for post-response work, then returns the newest email to an address. */
const lastEmailTo = async (address) => {
  await whenIdle();

  return outbox.filter((message) => message.to === address).at(-1);
};

const tokenIn = (message) => message.text.match(/#token=([\w-]+)/)[1];

const registerAndLogin = async (email = "asha@example.com") => {
  await post("/auth/register", { name: "Asha Menon", email, password: PASSWORD });

  const login = await post("/auth/login", { email, password: PASSWORD });

  return `Bearer ${login.body.data.accessToken}`;
};

beforeEach(() => {
  outbox.length = 0;
  vi.mocked(sendEmail).mockClear();
});

describe("email verification", () => {
  it("emails a link carrying the token in the URL fragment, and stores only its hash", async () => {
    const response = await post("/auth/register", {
      name: "Asha Menon",
      email: "asha@example.com",
      password: PASSWORD,
    });

    expect(response.status).toBe(201);

    const message = await lastEmailTo("asha@example.com");

    expect(message.subject).toMatch(/verify/i);
    expect(message.text).toContain("http://localhost:5173/verify-email#token=");

    const token = tokenIn(message);
    const stored = await User.findOne({ email: "asha@example.com" }).select(
      "+emailVerificationTokenHash +emailVerificationExpires",
    );

    expect(stored.emailVerificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.emailVerificationTokenHash).not.toContain(token);
    expect(stored.emailVerificationExpires.getTime()).toBeGreaterThan(
      Date.now() + 23 * 60 * 60 * 1000,
    );
  });

  it("refuses an unverified account at requireVerified, then admits the SAME token once verified", async () => {
    const accessToken = await registerAndLogin();
    const token = tokenIn(await lastEmailTo("asha@example.com"));

    const before = await post("/organizer/request", { message: MESSAGE }, accessToken);

    expect(before.status).toBe(403);
    expect(before.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    const verify = await post("/auth/verify-email", { token });

    expect(verify.status).toBe(200);
    expect(verify.body.data).toEqual({ isEmailVerified: true });

    // No re-login: isEmailVerified is read per request, never from the token.
    const after = await post("/organizer/request", { message: MESSAGE }, accessToken);

    expect(after.status).toBe(201);
  });

  it("treats a second click on the same link as success", async () => {
    await post("/auth/register", { name: "Asha", email: "asha@example.com", password: PASSWORD });
    const token = tokenIn(await lastEmailTo("asha@example.com"));

    expect((await post("/auth/verify-email", { token })).status).toBe(200);
    expect((await post("/auth/verify-email", { token })).status).toBe(200);

    expect((await User.findOne({ email: "asha@example.com" })).isEmailVerified).toBe(true);
  });

  it("refuses an expired link and leaves the account unverified", async () => {
    await post("/auth/register", { name: "Asha", email: "asha@example.com", password: PASSWORD });
    const token = tokenIn(await lastEmailTo("asha@example.com"));

    await User.updateOne(
      { email: "asha@example.com" },
      { emailVerificationExpires: new Date(Date.now() - 1000) },
    );

    const response = await post("/auth/verify-email", { token });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.details.token).toBeDefined();
    expect((await User.findOne({ email: "asha@example.com" })).isEmailVerified).toBe(false);
  });

  it("refuses a link that was never issued", async () => {
    const response = await post("/auth/verify-email", { token: "x".repeat(43) });

    expect(response.status).toBe(400);
  });

  it("resend issues a fresh link and retires the old one", async () => {
    const accessToken = await registerAndLogin();
    const first = tokenIn(await lastEmailTo("asha@example.com"));

    expect((await post("/auth/resend-verification", undefined, accessToken)).status).toBe(204);

    const second = tokenIn(await lastEmailTo("asha@example.com"));

    expect(second).not.toBe(first);
    expect((await post("/auth/verify-email", { token: first })).status).toBe(400);
    expect((await post("/auth/verify-email", { token: second })).status).toBe(200);
  });

  it("resend requires a session", async () => {
    expect((await post("/auth/resend-verification")).status).toBe(401);
  });

  it("resend for an already-verified account sends nothing", async () => {
    const user = await createUser({ isEmailVerified: true });

    expect((await post("/auth/resend-verification", undefined, bearer(user))).status).toBe(204);

    await whenIdle();

    expect(outbox).toHaveLength(0);
  });
});

describe("forgot and reset password", () => {
  it("answers 204 for an unknown address and sends nothing", async () => {
    const response = await post("/auth/forgot-password", { email: "nobody@example.com" });

    expect(response.status).toBe(204);

    await whenIdle();

    expect(outbox).toHaveLength(0);
  });

  it("answers 204 for a known address and emails a reset link valid for an hour", async () => {
    await createUser({ email: "sam@example.com" });

    const response = await post("/auth/forgot-password", { email: "sam@example.com" });

    expect(response.status).toBe(204);

    const message = await lastEmailTo("sam@example.com");

    expect(message.text).toContain("http://localhost:5173/reset-password#token=");

    const stored = await User.findOne({ email: "sam@example.com" }).select(
      "+passwordResetTokenHash +passwordResetExpires",
    );
    const remaining = stored.passwordResetExpires.getTime() - Date.now();

    expect(stored.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(remaining).toBeGreaterThan(55 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("replaces the password, ends every existing session, and refuses the link a second time", async () => {
    await createUser({ email: "sam@example.com" });

    const login = await post("/auth/login", { email: "sam@example.com", password: PASSWORD });
    const oldAccess = `Bearer ${login.body.data.accessToken}`;
    const oldCookie = refreshCookieFrom(login);

    await post("/auth/forgot-password", { email: "sam@example.com" });
    const token = tokenIn(await lastEmailTo("sam@example.com"));

    const NEW_PASSWORD = "a completely new passphrase";

    expect((await post("/auth/reset-password", { token, password: NEW_PASSWORD })).status).toBe(204);

    expect((await post("/auth/login", { email: "sam@example.com", password: PASSWORD })).status).toBe(401);
    expect((await post("/auth/login", { email: "sam@example.com", password: NEW_PASSWORD })).status).toBe(200);

    // tokenVersion was bumped: the access token and refresh cookie issued
    // before the reset are both dead.
    expect((await getMe(oldAccess)).status).toBe(401);
    expect((await refreshWith(oldCookie)).status).toBe(401);

    expect(
      (await post("/auth/reset-password", { token, password: "yet another passphrase" })).status,
    ).toBe(400);
  });

  it("lets exactly one of two concurrent redemptions succeed", async () => {
    await createUser({ email: "sam@example.com" });
    await post("/auth/forgot-password", { email: "sam@example.com" });
    const token = tokenIn(await lastEmailTo("sam@example.com"));

    const responses = await Promise.all([
      post("/auth/reset-password", { token, password: "first new passphrase" }),
      post("/auth/reset-password", { token, password: "second new passphrase" }),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([204, 400]);
    expect((await User.findOne({ email: "sam@example.com" })).tokenVersion).toBe(1);
  });

  it("refuses an expired reset link and keeps the old password", async () => {
    await createUser({ email: "sam@example.com" });
    await post("/auth/forgot-password", { email: "sam@example.com" });
    const token = tokenIn(await lastEmailTo("sam@example.com"));

    await User.updateOne(
      { email: "sam@example.com" },
      { passwordResetExpires: new Date(Date.now() - 1000) },
    );

    expect((await post("/auth/reset-password", { token, password: "a new passphrase" })).status).toBe(400);
    expect((await post("/auth/login", { email: "sam@example.com", password: PASSWORD })).status).toBe(200);
  });

  it("holds the new password to the registration rules", async () => {
    const response = await post("/auth/reset-password", {
      token: "x".repeat(43),
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toBeDefined();
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("ends the session and clears the refresh cookie with matching attributes", async () => {
    await createUser({ email: "sam@example.com" });

    const login = await post("/auth/login", { email: "sam@example.com", password: PASSWORD });
    const access = `Bearer ${login.body.data.accessToken}`;
    const cookie = refreshCookieFrom(login);

    const response = await post("/auth/logout", undefined, access);

    expect(response.status).toBe(204);

    const cleared = response.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));

    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/Path=\/api\/v1\/auth/);

    expect((await getMe(access)).status).toBe(401);
    expect((await refreshWith(cookie)).status).toBe(401);
  });

  it("requires a session", async () => {
    expect((await post("/auth/logout")).status).toBe(401);
  });
});

describe("PATCH /api/v1/auth/password", () => {
  const NEW_PASSWORD = "a completely new passphrase";

  const changePassword = (body, authorization) => {
    const req = request(app).patch("/api/v1/auth/password");

    return (authorization ? req.set("Authorization", authorization) : req).send(body);
  };

  const signIn = async (password = PASSWORD) => {
    const login = await post("/auth/login", { email: "sam@example.com", password });

    return {
      status: login.status,
      access: login.body.data ? `Bearer ${login.body.data.accessToken}` : null,
      cookie: refreshCookieFrom(login),
    };
  };

  it("requires a session", async () => {
    const response = await changePassword({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

    expect(response.status).toBe(401);
  });

  it("replaces the password and ends every session, including the one that asked", async () => {
    await createUser({ email: "sam@example.com" });
    const session = await signIn();

    const response = await changePassword(
      { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      session.access,
    );

    expect(response.status).toBe(204);

    const cleared = response.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));

    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/Path=\/api\/v1\/auth/);

    // Password change is a tokenVersion event (§18): both tokens are dead.
    expect((await getMe(session.access)).status).toBe(401);
    expect((await refreshWith(session.cookie)).status).toBe(401);

    expect((await signIn(PASSWORD)).status).toBe(401);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);
    expect((await User.findOne({ email: "sam@example.com" })).tokenVersion).toBe(1);
  });

  it("refuses a wrong current password with 400, leaving the password and session intact", async () => {
    await createUser({ email: "sam@example.com" });
    const session = await signIn();

    const response = await changePassword(
      { currentPassword: "not my password", newPassword: NEW_PASSWORD },
      session.access,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.details.currentPassword).toBeDefined();

    expect((await getMe(session.access)).status).toBe(200);
    expect((await signIn(PASSWORD)).status).toBe(200);
  });

  it.each([
    ["too short", "short"],
    ["the same as the current one", PASSWORD],
  ])("refuses a new password that is %s", async (_, newPassword) => {
    await createUser({ email: "sam@example.com" });
    const session = await signIn();

    const response = await changePassword({ currentPassword: PASSWORD, newPassword }, session.access);

    expect(response.status).toBe(400);
    expect(response.body.error.details.newPassword).toBeDefined();
    expect((await User.findOne({ email: "sam@example.com" })).tokenVersion).toBe(0);
  });

  it("retires an outstanding reset link", async () => {
    await createUser({ email: "sam@example.com" });
    await post("/auth/forgot-password", { email: "sam@example.com" });
    const resetToken = tokenIn(await lastEmailTo("sam@example.com"));

    const session = await signIn();

    expect(
      (await changePassword({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD }, session.access))
        .status,
    ).toBe(204);

    expect(
      (await post("/auth/reset-password", { token: resetToken, password: "someone else's choice" }))
        .status,
    ).toBe(400);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);
  });
});

describe("a failing mail provider", () => {
  it("never fails the registration that triggered the email", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(
      Object.assign(new Error("SMTP unavailable"), { code: "ECONNREFUSED" }),
    );

    const response = await post("/auth/register", {
      name: "Asha",
      email: "asha@example.com",
      password: PASSWORD,
    });

    expect(response.status).toBe(201);
    await expect(whenIdle()).resolves.toBeUndefined();
    expect(await User.exists({ email: "asha@example.com" })).toBeTruthy();
  });
});
