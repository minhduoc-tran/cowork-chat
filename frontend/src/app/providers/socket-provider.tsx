import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useAuthStore } from "@/features/auth"

import { connectSocket, disconnectSocket } from "@/shared/lib/socket"

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      disconnectSocket()
      return
    }

    const socket = connectSocket()

    socket.on("connect", () => {
       
      console.log("[socket] connected:", socket.id)
    })

    socket.on("disconnect", (reason) => {
       
      console.log("[socket] disconnected:", reason)
    })

    // Friend request received
    socket.on("friend.request.received", (payload) => {
      void queryClient.invalidateQueries({
        queryKey: ["friends", "requests", "pending"],
      })
      toast.info(
        t("socket.friendRequestReceived", {
          name: payload.sender?.displayName ?? "Someone",
        })
      )
    })

    // Friend request accepted
    socket.on("friend.request.accepted", (payload) => {
      void queryClient.invalidateQueries({ queryKey: ["friends"] })
      void queryClient.invalidateQueries({
        queryKey: ["friends", "requests"],
      })
      const otherUser = payload.participants?.[0]
      toast.success(
        t("socket.friendRequestAccepted", {
          name: otherUser?.displayName ?? "Someone",
        })
      )
    })

    // Conversation created (group)
    socket.on("conversation.created", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    // New message received
    socket.on("message.received", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    // Conversation pin updated
    socket.on("pin:updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated, isHydrated, queryClient, t])

  return <>{children}</>
}
