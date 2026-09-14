import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createAdmin } from "../scripts/createAdmin.js";
import { PASSWORD, createUser } from "./helpers.js";

const login = (email, password) =>
  request(app).post("/api/v1/auth/login").send({ email, password });

describe("scripts/createAdmin", () => {
  it("creates a verified admin whose generated password works", async () => {
    const result = await createAdmin({ email: "  Ops@Example.com ", name: "Ops Admin" });

    expect(result).toMatchObject({ action: "created", email: "ops@example.com" });
    expect(result.password.length).toBeGreaterThanOrEqual(24);

    const response = await login("ops@example.com", result.password);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ role: "admin", isEmailVerified: true });
  });

  it("promotes an existing account without touching its password", async () => {
    await createUser({ email: "sam@example.com" });

    const result = await createAdmin({ email: "sam@example.com" });

    expect(result).toEqual({ action: "promoted", email: "sam@example.com", password: null });

    const response = await login("sam@example.com", PASSWORD);

    expect(response.body.data.user).toMatchObject({ role: "admin", isEmailVerified: true });
  });

  it("is idempotent", async () => {
    await createAdmin({ email: "ops@example.com" });

    expect((await createAdmin({ email: "ops@example.com" })).action).toBe("unchanged");
  });

  it("rejects an invalid email", async () => {
    await expect(createAdmin({ email: "not-an-email" })).rejects.toThrow();
  });
});
