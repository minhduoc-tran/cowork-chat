import { getSocketServer } from "./socket.server";
import type {
  ConversationCreatedPayload,
  FriendRequestAcceptedPayload,
  FriendRequestReceivedPayload,
  MessageReadPayload,
  MessageReceivedPayload,
  ViewerScopedPresencePayload,
  TypingUpdatedPayload,
  MessageUpdatedPayload,
  ConversationPinPayload,
  MessageDeletedPayload
} from "../types/socket.types";

export const socketEmitter = {
  emitFriendRequestReceived(
    userId: number,
    payload: FriendRequestReceivedPayload
  ) {
    getSocketServer()
      .to(`user:${userId}`)
      .emit("friend.request.received", payload);
  },
  emitFriendRequestAccepted(
    userIds: number[],
    payload: FriendRequestAcceptedPayload
  ) {
    const io = getSocketServer();
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("friend.request.accepted", payload);
    });
  },
  emitConversationCreated(
    userIds: number[],
    payload: ConversationCreatedPayload
  ) {
    const io = getSocketServer();
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("conversation.created", payload);
    });
  },
  emitConversationMessage(
    conversationId: number,
    userIds: number[],
    senderId: number,
    payload: MessageReceivedPayload
  ) {
    const io = getSocketServer();
    io.to(`conversation:${conversationId}`).emit("message.received", payload);
    userIds
      .filter(userId => userId !== senderId)
      .forEach(userId => {
        io.to(`user:${userId}`).emit("message.received", payload);
      });
    // Also notify sender via user room (for sidebar/conversation list updates)
    io.to(`user:${senderId}`).emit("message.received", payload);
  },

  emitMessageUpdated(
    conversationId: number,
    userIds: number[],
    payload: MessageUpdatedPayload
  ) {
    const io = getSocketServer();
    io.to(`conversation:${conversationId}`).emit("message.updated", payload);
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("message.updated", payload);
    });
  },

  emitMessageDeleted(
    conversationId: number,
    userIds: number[],
    messageId: number
  ) {
    const io = getSocketServer();
    io.to(`conversation:${conversationId}`).emit("message.deleted", {
      conversationId,
      messageId
    });
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("message.deleted", {
        conversationId,
        messageId
      });
    });
  },

  emitPresenceUpdated(viewerPayloads: ViewerScopedPresencePayload[]) {
    const io = getSocketServer();
    viewerPayloads.forEach(({ viewerUserId, payload }) => {
      io.to(`user:${viewerUserId}`).emit("presence.updated", payload);
    });
  },

  emitTypingUpdated(input: {
    recipientUserIds: number[];
    payload: TypingUpdatedPayload;
  }) {
    const io = getSocketServer();

    input.recipientUserIds.forEach(userId => {
      io.to(`user:${userId}`).emit("typing.updated", input.payload);
    });
  },

  emitMessageRead(
    conversationId: number,
    readerSocketId: string | null,
    payload: MessageReadPayload
  ) {
    const io = getSocketServer().to(`conversation:${conversationId}`);

    if (readerSocketId) {
      io.except(readerSocketId).emit("message.read", payload);
      return;
    }

    io.emit("message.read", payload);
  },

  emitConversationPinUpdated(
    conversationId: number,
    userIds: number[],
    pins: ConversationPinPayload[]
  ) {
    const io = getSocketServer();
    const payload = { conversationId, pins };
    io.to(`conversation:${conversationId}`).emit("pin:updated", payload);
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("pin:updated", payload);
    });
  },

  emitConversationDeleted(conversationId: number, userIds: number[]) {
    const io = getSocketServer();
    io.to(`conversation:${conversationId}`).emit("conversation.deleted", {
      conversationId
    });
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("conversation.deleted", {
        conversationId
      });
    });
  }
};
