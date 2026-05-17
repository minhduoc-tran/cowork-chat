import { createServer } from "http";
import { Server, Socket } from "socket.io";
import app from "../app";
import env from "../configs/env";
import { verifyAccessToken } from "../utils/jwt.util";
import { conversationService } from "../services/conversation.service";
import { messageService } from "../services/message.service";
import { presenceState } from "./presence-state";
import { presenceService } from "../services/presence.service";
import { socketEmitter } from "./socket-emitter";
import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

let io: Server | null = null;

export function createHttpServer() {
  const httpServer = createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN || false,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (typeof token !== "string") {
      return next(new Error("Access token required"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = Number(payload.sub);
      return next();
    } catch {
      return next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", socket => {
    void registerSocketConnectionHandlers(socket);

    socket.on("conversation.join", async payload => {
      try {
        await conversationService.ensureActiveConversationMember(
          payload.conversationId,
          socket.data.userId
        );

        socket.join(`conversation:${payload.conversationId}`);
        socket.emit("conversation.joined", {
          conversationId: payload.conversationId
        });
      } catch (error) {
        const err = error as ApiError;
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("message.send", async payload => {
      try {
        let result;

        if (typeof payload.conversationId === "number") {
          result = await messageService.sendConversationTextMessage({
            conversationId: payload.conversationId,
            senderId: socket.data.userId,
            content: payload.content,
            replyToId: payload.replyToId
          });
        } else if (typeof payload.targetUserId === "number") {
          result = await messageService.sendDirectTextMessage({
            senderId: socket.data.userId,
            targetUserId: payload.targetUserId,
            content: payload.content,
            replyToId: payload.replyToId
          });
        } else {
          socket.emit("error", { message: "Invalid message payload" });
          return;
        }

        socketEmitter.emitConversationMessage(
          result.conversation.id,
          result.members.map(m => m.userId),
          socket.data.userId,
          {
            conversation: result.conversation,
            members: result.members.map(m => ({
              userId: m.userId,
              displayName: "",
              email: "",
              avatar: null,
              isFriend: false
            })),
            message: result.message,
            replyTo: result.replyTo
          }
        );
      } catch (error) {
        const err = error as ApiError;
        socket.emit("error", { message: err.message });
      }
    });
  });

  return httpServer;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket server not initialized");
  }

  return io;
}

export async function registerSocketConnectionHandlers(socket: Socket) {
  const { firstSocketForUser } = presenceState.addSocket(
    socket.data.userId,
    socket.id
  );

  socket.join(`user:${socket.data.userId}`);

  if (firstSocketForUser) {
    const changed = await presenceService.setUserOnline(socket.data.userId);

    if (changed) {
      const audience = await presenceService.listPresenceAudienceUserIds(
        socket.data.userId
      );
      const payloads = await presenceService.buildPresencePayloadsForAudience({
        targetUserId: socket.data.userId,
        status: "online",
        activeConversationId: null,
        audienceUserIds: audience
      });
      socketEmitter.emitPresenceUpdated(payloads);
    }
  }

  socket.on("presence.set-active-conversation", async payload => {
    if (payload.conversationId !== null) {
      await conversationService.ensureActiveConversationMember(
        payload.conversationId,
        socket.data.userId
      );
    }

    const previous = presenceState.setActiveConversation(
      socket.id,
      payload.conversationId
    );

    if (previous.previousConversationId !== null) {
      const changed = presenceState.stopTyping(
        previous.previousConversationId,
        socket.data.userId
      );

      if (changed) {
        socketEmitter.emitTypingUpdated(
          previous.previousConversationId,
          socket.id,
          {
            conversationId: previous.previousConversationId,
            userId: socket.data.userId,
            isTyping: false
          }
        );
      }
    }

    if (previous.previousConversationId !== payload.conversationId) {
      const activeConversationId = presenceState.getEffectiveActiveConversation(
        socket.data.userId
      );
      const audience = await presenceService.listPresenceAudienceUserIds(
        socket.data.userId
      );
      const payloads = await presenceService.buildPresencePayloadsForAudience({
        targetUserId: socket.data.userId,
        status:
          activeConversationId === null ? "online" : "active_in_conversation",
        activeConversationId,
        audienceUserIds: audience
      });
      socketEmitter.emitPresenceUpdated(payloads);
    }
  });

  socket.on("typing.start", async payload => {
    await conversationService.ensureActiveConversationMember(
      payload.conversationId,
      socket.data.userId
    );

    const activeConversationId = presenceState.getEffectiveActiveConversation(
      socket.data.userId
    );

    if (activeConversationId !== payload.conversationId) {
      socket.emit("error", {
        message: "Typing is only allowed in the active conversation"
      });
      return;
    }

    presenceState.startTyping({
      conversationId: payload.conversationId,
      userId: socket.data.userId,
      onExpire: ({ conversationId, userId }) => {
        socketEmitter.emitTypingUpdated(conversationId, null, {
          conversationId,
          userId,
          isTyping: false
        });
      }
    });

    socketEmitter.emitTypingUpdated(payload.conversationId, socket.id, {
      conversationId: payload.conversationId,
      userId: socket.data.userId,
      isTyping: true
    });
  });

  socket.on("typing.stop", async payload => {
    await conversationService.ensureActiveConversationMember(
      payload.conversationId,
      socket.data.userId
    );

    const changed = presenceState.stopTyping(
      payload.conversationId,
      socket.data.userId
    );

    if (changed) {
      socketEmitter.emitTypingUpdated(payload.conversationId, socket.id, {
        conversationId: payload.conversationId,
        userId: socket.data.userId,
        isTyping: false
      });
    }
  });

  socket.on("disconnect", async () => {
    const removed = presenceState.removeSocket(socket.id);

    if (removed.userId === null || !removed.wentOffline) {
      return;
    }

    if (removed.previousConversationId !== null) {
      const changed = presenceState.stopTyping(
        removed.previousConversationId,
        removed.userId
      );

      if (changed) {
        socketEmitter.emitTypingUpdated(removed.previousConversationId, null, {
          conversationId: removed.previousConversationId,
          userId: removed.userId,
          isTyping: false
        });
      }
    }

    const lastSeenAt = new Date();
    await presenceService.setUserOffline(removed.userId, lastSeenAt);
    const audience = await presenceService.listPresenceAudienceUserIds(
      removed.userId
    );
    const payloads = await presenceService.buildPresencePayloadsForAudience({
      targetUserId: removed.userId,
      status: "offline",
      activeConversationId: null,
      audienceUserIds: audience
    });
    socketEmitter.emitPresenceUpdated(payloads);
  });

  socket.on("error", error => {
    logger.error(
      { userId: socket.data.userId, socketId: socket.id, error },
      "Socket error"
    );
  });
}
