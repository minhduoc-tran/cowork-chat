import { describe, expect, it, vi } from "vitest";
import { conversationService } from "../../src/services/conversation.service";

vi.mock("../../src/drizzle", () => ({
  db: {
    query: {
      friendshipsTable: {
        findMany: vi.fn()
      }
    },
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

import { conversationService } from "../../src/services/conversation.service";

describe("conversationService.createGroupConversation", () => {
  it("rejects when no invited friend remains after normalization", async () => {
    await expect(
      conversationService.createGroupConversation({
        creatorId: 5,
        name: "Project Team",
        memberIds: [5, 5]
      })
    ).rejects.toThrow("A group must include at least one friend besides the creator");
  });
});