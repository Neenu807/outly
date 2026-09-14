import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

/**
 * Phase 0's proof that the harness works end to end: Supertest drives the
 * exported app in-process against a real in-memory MongoDB, with no port bound.
 */
describe("GET /api/v1/health", () => {
  it("reports a live database connection in the success envelope", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok", db: "connected" },
    });
    expect(typeof response.body.data.uptime).toBe("number");
  });
});

describe("the error contract", () => {
  it("returns the standard envelope for an unknown route, not an HTML page", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid body with VALIDATION_FAILED and field-keyed details", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "not-an-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(response.body.error.details)).toEqual(
      expect.arrayContaining(["name", "email", "password"]),
    );
  });

  it("strips unknown keys instead of trusting them", async () => {
    // `validate` replaces req.body rather than merging, so a privilege field in
    // the body never reaches the database (§21).
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Real User",
      email: "real@example.com",
      password: "correct horse battery",
      role: "admin",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("user");
  });
});
