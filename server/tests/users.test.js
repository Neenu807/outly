import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { bearer, createUser } from "./helpers.js";

const patchMe = (body, user) => {
  const req = request(app).patch("/api/v1/users/me");

  return (user ? req.set("Authorization", bearer(user)) : req).send(body);
};

describe("PATCH /api/v1/users/me", () => {
  it("requires a session", async () => {
    expect((await patchMe({ name: "Anyone" })).status).toBe(401);
  });

  it("updates the profile and normalises what it stores", async () => {
    const user = await createUser();

    const response = await patchMe(
      {
        name: "  Asha Menon ",
        city: "Kochi",
        interests: ["Pottery", "pottery", "table-tennis"],
        avatarUrl: "https://cdn.example.com/asha.png",
        phone: "+91 98765-43210",
        smsOptIn: true,
      },
      user,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      name: "Asha Menon",
      city: "Kochi",
      interests: ["pottery", "table-tennis"],
      avatarUrl: "https://cdn.example.com/asha.png",
      phone: "+919876543210",
      smsOptIn: true,
    });
  });

  it("ignores every field a member may not set on themselves", async () => {
    const user = await createUser();

    const response = await patchMe(
      {
        name: "Renamed",
        role: "admin",
        organizerStatus: "approved",
        isEmailVerified: true,
        tokenVersion: 9,
        email: "someone-else@example.com",
      },
      user,
    );

    expect(response.status).toBe(200);

    expect(await User.findById(user._id)).toMatchObject({
      name: "Renamed",
      role: "user",
      organizerStatus: "none",
      isEmailVerified: false,
      tokenVersion: 0,
      email: user.email,
    });
  });

  it("treats a body of only forbidden fields as empty", async () => {
    const user = await createUser();

    const response = await patchMe({ role: "admin", organizerStatus: "approved" }, user);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect((await User.findById(user._id)).role).toBe("user");
  });

  it("refuses SMS opt-in without a phone number", async () => {
    const user = await createUser();

    const response = await patchMe({ smsOptIn: true }, user);

    expect(response.status).toBe(400);
    expect(response.body.error.details.smsOptIn).toBeDefined();
    expect((await User.findById(user._id)).smsOptIn).toBe(false);
  });

  it("withdraws the SMS opt-in when the phone number is removed", async () => {
    const user = await createUser({ phone: "+919876543210", smsOptIn: true });

    const response = await patchMe({ phone: null }, user);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ phone: null, smsOptIn: false });
  });

  it("clears an optional field when sent null", async () => {
    const user = await createUser({ city: "Kochi" });

    const response = await patchMe({ city: null }, user);

    expect(response.body.data.user.city).toBeNull();
  });

  it.each([
    [{ phone: "98765 43210" }, "phone"],
    [{ avatarUrl: "http://cdn.example.com/asha.png" }, "avatarUrl"],
    [{ interests: Array.from({ length: 16 }, (_, i) => `interest-${i}`) }, "interests"],
    [{ interests: ["Pottery & Clay"] }, "interests"],
    [{ name: "A" }, "name"],
  ])("rejects %j with details for %s", async (body, field) => {
    const user = await createUser();

    const response = await patchMe(body, user);

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.error.details).some((key) => key.startsWith(field))).toBe(true);
  });
});
