import { getSocketServer } from "./socket.server";
import type {
  ConversationCreatedPayload,
  FriendRequestAcceptedPayload,
  FriendRequestReceivedPayload
} from "../types/socket.types";

export const socketEmitter = {
  emitFriendRequestReceived(userId: number, payload: FriendRequestReceivedPayload) {
    getSocketServer().to(`user:${userId}`).emit("friend.request.received", payload);
  },
  emitFriendRequestAccepted(userIds: number[], payload: FriendRequestAcceptedPayload) {
    const io = getSocketServer();
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("friend.request.accepted", payload);
    });
  },
  emitConversationCreated(userIds: number[], payload: ConversationCreatedPayload) {
    const io = getSocketServer();
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("conversation.created", payload);
    });
  }
};