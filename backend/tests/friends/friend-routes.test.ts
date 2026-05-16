import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/test-app";

describe("friend routes", () => {
  it("returns 401 when listing friends without a bearer token", async () => {
    const app = createTestApp();

    const response = await request(app).get("/api/v1/friends");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Access token required");
  });
});