import { getSocketServer } from "./socket.server";
import type {
  ConversationCreatedPayload,
  FriendRequestAcceptedPayload,
  FriendRequestReceivedPayload,
  MessageReadPayload,
  MessageReceivedPayload,
  ViewerScopedPresencePayload,
  TypingUpdatedPayload,
  MessageUpdatedPayload
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

  emitPresenceUpdated(viewerPayloads: ViewerScopedPresencePayload[]) {
    const io = getSocketServer();
    viewerPayloads.forEach(({ viewerUserId, payload }) => {
      io.to(`user:${viewerUserId}`).emit("presence.updated", payload);
    });
  },

  emitTypingUpdated(
    conversationId: number,
    senderSocketId: string | null,
    payload: TypingUpdatedPayload
  ) {
    const io = getSocketServer().to(`conversation:${conversationId}`);

    if (senderSocketId) {
      io.except(senderSocketId).emit("typing.updated", payload);
      return;
    }

    io.emit("typing.updated", payload);
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
  }
};
