import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app";
import { createBearerToken } from "../helpers/test-auth";
import { friendService } from "../../src/services/friend.service";

vi.mock("../../src/services/friend.service", () => ({
  friendService: {
    sendRequest: vi.fn()
  }
}));

describe("friend routes", () => {
  it("returns 401 when listing friends without a bearer token", async () => {
    const app = createTestApp();

    const response = await request(app).get("/api/v1/friends");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Access token required");
  });

  it("creates a friend request for an authenticated user", async () => {
    vi.mocked(friendService.sendRequest).mockResolvedValue({
      id: 7,
      senderId: 1,
      receiverId: 2,
      status: "pending"
    } as never);

    const response = await request(createTestApp())
      .post("/api/v1/friends/requests")
      .set("Authorization", createBearerToken(1, "sender@example.com"))
      .send({ receiverId: 2 });

    expect(response.status).toBe(201);
    expect(response.body.data.request.id).toBe(7);
  });
});