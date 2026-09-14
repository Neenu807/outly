import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import env from "../src/config/env.js";
import User from "../src/models/User.js";
import { PASSWORD, bearer, createUser } from "./helpers.js";

beforeAll(async () => {
  // The unique email index is what makes a duplicate impossible rather than
  // merely checked, so it must exist before the concurrency test runs.
  await User.createIndexes();
});

const register = (body) => request(app).post("/api/v1/auth/register").send(body);
const login = (body) => request(app).post("/api/v1/auth/login").send(body);

const me = (authorization) => {
  const req = request(app).get("/api/v1/auth/me");

  return authorization ? req.set("Authorization", authorization) : req;
};

const refreshCookieFrom = (response) =>
  response.headers["set-cookie"]
    ?.find((cookie) => cookie.startsWith("refreshToken="))
    ?.split(";")[0];

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const signAccess = (payload, options) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { algorithm: "HS256", ...options });

describe("POST /api/v1/auth/register", () => {
  it("creates a member with the v5.1 defaults and returns no secrets", async () => {
    const response = await register({
      name: "Asha Menon",
      email: "asha@example.com",
      password: PASSWORD,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: "asha@example.com",
      role: "user",
      organizerStatus: "none",
      isEmailVerified: false,
    });

    const raw = JSON.stringify(response.body);

    for (const field of [
      "passwordHash",
      "tokenVersion",
      "TokenHash",
      "organizerEnabled",
      "organizerVerified",
    ]) {
      expect(raw).not.toContain(field);
    }

    const stored = await User.findOne({ email: "asha@example.com" });

    expect(stored.tokenVersion).toBe(0);
    // select: false at the schema — a forgotten projection cannot leak it.
    expect(stored.passwordHash).toBeUndefined();
  });

  it("ignores privilege fields in the request body", async () => {
    await register({
      name: "Mallory",
      email: "mallory@example.com",
      password: PASSWORD,
      role: "admin",
      organizerStatus: "approved",
      isEmailVerified: true,
      tokenVersion: 99,
    });

    const stored = await User.findOne({ email: "mallory@example.com" });

    expect(stored).toMatchObject({
      role: "user",
      organizerStatus: "none",
      isEmailVerified: false,
      tokenVersion: 0,
    });
  });

  it("rejects a duplicate email regardless of case", async () => {
    await register({ name: "Asha", email: "asha@example.com", password: PASSWORD });

    const response = await register({
      name: "Asha Again",
      email: "  ASHA@Example.com ",
      password: PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("lets the unique index settle a concurrent duplicate", async () => {
    const body = { name: "Twin", email: "twin@example.com", password: PASSWORD };

    const responses = await Promise.all([register(body), register(body)]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(responses.find((r) => r.status === 409).body.error.code).toBe(
      "EMAIL_IN_USE",
    );
    expect(await User.countDocuments({ email: "twin@example.com" })).toBe(1);
  });

  it("rejects a password bcrypt would silently truncate", async () => {
    const response = await register({
      name: "Long Password",
      email: "long@example.com",
      password: "a".repeat(73),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.details.password).toBeDefined();
  });
});

describe("POST /api/v1/auth/login", () => {
  it("returns an access token and an httpOnly refresh cookie scoped to /api/v1/auth", async () => {
    const user = await createUser({ email: "sam@example.com" });

    const response = await login({ email: "sam@example.com", password: PASSWORD });

    expect(response.status).toBe(200);
    expect(typeof response.body.data.accessToken).toBe("string");
    expect(response.body.data.user.id).toBe(String(user._id));

    const cookie = response.headers["set-cookie"].find((c) =>
      c.startsWith("refreshToken="),
    );

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("normalises the email before looking it up", async () => {
    await createUser({ email: "sam@example.com" });

    const response = await login({ email: "  SAM@Example.COM ", password: PASSWORD });

    expect(response.status).toBe(200);
  });

  it("gives an unknown email and a wrong password the identical answer", async () => {
    await createUser({ email: "sam@example.com" });

    const unknown = await login({ email: "nobody@example.com", password: PASSWORD });
    const wrong = await login({ email: "sam@example.com", password: "not the password" });

    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.body).toEqual(wrong.body);
  });

  it("spends a bcrypt comparison on an unknown email too", async () => {
    await createUser({ email: "sam@example.com" });

    const time = async (body) => {
      const start = performance.now();
      await login(body);
      return performance.now() - start;
    };

    const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

    await time({ email: "warmup@example.com", password: PASSWORD });

    const unknown = [];
    const wrong = [];

    for (let i = 0; i < 3; i += 1) {
      unknown.push(await time({ email: "nobody@example.com", password: PASSWORD }));
      wrong.push(await time({ email: "sam@example.com", password: "not the password" }));
    }

    // Skipping bcrypt makes the unknown-email path an order of magnitude
    // faster, so half is a wide margin rather than a flaky one.
    expect(median(unknown)).toBeGreaterThan(median(wrong) * 0.5);
  });
});

describe("token payloads", () => {
  it("carry only the subject and tokenVersion — never role, email or status", async () => {
    const user = await createUser({ email: "sam@example.com" });

    const response = await login({ email: "sam@example.com", password: PASSWORD });

    const access = jwt.decode(response.body.data.accessToken);
    const refresh = jwt.decode(refreshCookieFrom(response).split("=")[1]);

    for (const payload of [access, refresh]) {
      expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub", "tokenVersion"]);
      expect(payload.sub).toBe(String(user._id));
      expect(payload.tokenVersion).toBe(0);
    }
  });
});

describe("GET /api/v1/auth/me — requireAuth", () => {
  it("returns the session user with verification and organizer state", async () => {
    const user = await createUser();

    const response = await me(bearer(user));

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: String(user._id),
      isEmailVerified: false,
      organizerStatus: "none",
    });
  });

  it("reads verification and organizer state per request, not from the token", async () => {
    const user = await createUser();
    const token = bearer(user);

    await User.updateOne(
      { _id: user._id },
      { isEmailVerified: true, organizerStatus: "approved" },
    );

    // Same token, no re-login — the change is visible on the very next call.
    const response = await me(token);

    expect(response.body.data.user).toMatchObject({
      isEmailVerified: true,
      organizerStatus: "approved",
    });
  });

  it("rejects a missing or malformed Authorization header", async () => {
    const user = await createUser();

    for (const response of [
      await me(),
      await me("Token abc"),
      await me(bearer(user).replace("Bearer ", "Bearer")),
    ]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects a token whose payload was altered", async () => {
    const victim = await createUser();
    const attacker = await createUser();
    const [header, , signature] = bearer(attacker).slice(7).split(".");

    const forged = `${header}.${base64url({ sub: String(victim._id), tokenVersion: 0 })}.${signature}`;

    const response = await me(`Bearer ${forged}`);

    expect(response.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const user = await createUser();

    const expired = signAccess(
      { tokenVersion: 0, exp: Math.floor(Date.now() / 1000) - 60 },
      { subject: String(user._id) },
    );

    expect((await me(`Bearer ${expired}`)).status).toBe(401);
  });

  it("rejects a refresh token presented as an access token", async () => {
    const user = await createUser();

    const refreshSigned = jwt.sign({ tokenVersion: 0 }, env.JWT_REFRESH_SECRET, {
      subject: String(user._id),
      expiresIn: "5m",
    });

    expect((await me(`Bearer ${refreshSigned}`)).status).toBe(401);
  });

  it("rejects an unsigned alg:none token", async () => {
    const user = await createUser();

    const unsigned = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({
      sub: String(user._id),
      tokenVersion: 0,
      iat: Math.floor(Date.now() / 1000),
    })}.`;

    expect((await me(`Bearer ${unsigned}`)).status).toBe(401);
  });

  it("revokes every issued token when tokenVersion is bumped", async () => {
    // Logout, password reset and password change do this in Step C; the
    // mechanism they rely on is what is proven here.
    const user = await createUser();
    const token = bearer(user);

    expect((await me(token)).status).toBe(200);

    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

    const response = await me(token);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a token whose account no longer exists", async () => {
    const user = await createUser();
    const token = bearer(user);

    await User.deleteOne({ _id: user._id });

    expect((await me(token)).status).toBe(401);
  });

  it("answers a malformed subject with 401, not a CastError", async () => {
    const token = signAccess({ tokenVersion: 0 }, { subject: "not-an-id", expiresIn: "5m" });

    const response = await me(`Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  const refreshWith = (cookie) => {
    const req = request(app).post("/api/v1/auth/refresh");

    return cookie ? req.set("Cookie", cookie) : req;
  };

  it("issues a working access token from a valid refresh cookie", async () => {
    await createUser({ email: "sam@example.com" });
    const cookie = refreshCookieFrom(
      await login({ email: "sam@example.com", password: PASSWORD }),
    );

    const response = await refreshWith(cookie);

    expect(response.status).toBe(200);
    expect((await me(`Bearer ${response.body.data.accessToken}`)).status).toBe(200);
  });

  it("refuses without a cookie", async () => {
    const response = await refreshWith();

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuses a refresh token issued before a tokenVersion bump", async () => {
    const user = await createUser({ email: "sam@example.com" });
    const cookie = refreshCookieFrom(
      await login({ email: "sam@example.com", password: PASSWORD }),
    );

    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

    expect((await refreshWith(cookie)).status).toBe(401);
  });

  it("refuses an access token placed in the refresh cookie", async () => {
    const user = await createUser();

    const response = await refreshWith(`refreshToken=${bearer(user).slice(7)}`);

    expect(response.status).toBe(401);
  });
});
