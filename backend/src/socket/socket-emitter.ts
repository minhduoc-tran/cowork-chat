import { getSocketServer } from "./socket.server";
import type {
  ConversationCreatedPayload,
  FriendRequestAcceptedPayload,
  FriendRequestReceivedPayload,
  MessageReceivedPayload,
  ViewerScopedPresencePayload,
  TypingUpdatedPayload
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
  }
};
