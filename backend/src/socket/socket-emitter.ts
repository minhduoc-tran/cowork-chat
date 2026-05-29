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
  MessageDeletedPayload,
  NotificationCreatedPayload
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
  },

  emitTaskCreated(
    conversationId: number | null,
    userIds: number[],
    payload: unknown
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit("task.created", payload);
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.created", payload);
    });
  },

  emitTaskUpdated(
    conversationId: number | null,
    userIds: number[],
    payload: unknown
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit("task.updated", payload);
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.updated", payload);
    });
  },

  emitTaskDeleted(
    conversationId: number | null,
    userIds: number[],
    payload: { taskId: number; conversationId: number | null }
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit("task.deleted", payload);
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.deleted", payload);
    });
  },

  emitTaskCommentCreated(
    conversationId: number | null,
    userIds: number[],
    payload: unknown
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit(
        "task.comment.created",
        payload
      );
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.comment.created", payload);
    });
  },

  emitTaskCommentUpdated(
    conversationId: number | null,
    userIds: number[],
    payload: unknown
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit(
        "task.comment.updated",
        payload
      );
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.comment.updated", payload);
    });
  },

  emitTaskCommentDeleted(
    conversationId: number | null,
    userIds: number[],
    payload: { taskId: number; commentId: number }
  ) {
    const io = getSocketServer();
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit(
        "task.comment.deleted",
        payload
      );
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit("task.comment.deleted", payload);
    });
  },

  emitNotificationCreated(userId: number, payload: NotificationCreatedPayload) {
    getSocketServer()
      .to(`user:${userId}`)
      .emit("notification.created", payload);
  }
};
