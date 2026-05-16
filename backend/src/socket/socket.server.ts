import { createServer } from "http";
import { Server, Socket } from "socket.io";
import app from "../app";
import env from "../configs/env";
import { verifyAccessToken } from "../utils/jwt.util";
import { conversationService } from "../services/conversation.service";
import { messageService } from "../services/message.service";
import { socketEmitter } from "./socket-emitter";
import { ApiError } from "../utils/api-error";

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
    socket.join(`user:${socket.data.userId}`);

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
            content: payload.content
          });
        } else if (typeof payload.targetUserId === "number") {
          result = await messageService.sendDirectTextMessage({
            senderId: socket.data.userId,
            targetUserId: payload.targetUserId,
            content: payload.content
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
            message: result.message
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
