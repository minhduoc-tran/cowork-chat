import { createServer } from "http";
import { Server } from "socket.io";
import app from "../app";
import env from "../configs/env";
import { verifyAccessToken } from "../utils/jwt.util";

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
  });

  return httpServer;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket server not initialized");
  }

  return io;
}