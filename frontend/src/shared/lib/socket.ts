import { io, Socket } from "socket.io-client"

import { ACCESS_TOKEN_KEY, API_BASE_URL } from "@/shared/api"

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket

  const token = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (!token) {
    throw new Error("No access token available for socket connection")
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
