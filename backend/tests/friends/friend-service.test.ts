import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/drizzle";

vi.mock("../../src/drizzle", () => ({
  db: {
    query: {
      friendRequestsTable: {
        findFirst: vi.fn()
      },
      friendshipsTable: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      usersTable: {
        findFirst: vi.fn()
      }
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    transaction: vi.fn()
  }
}));

vi.mock("../../src/socket/socket-emitter", () => ({
  socketEmitter: {
    emitFriendRequestReceived: vi.fn(),
    emitFriendRequestAccepted: vi.fn(),
    emitConversationCreated: vi.fn()
  }
}));

import { friendService } from "../../src/services/friend.service";

describe("friendService.sendRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when sender and receiver are the same user", async () => {
    await expect(
      friendService.sendRequest({ senderId: 11, receiverId: 11 })
    ).rejects.toThrow("Cannot send a friend request to yourself");
  });
});