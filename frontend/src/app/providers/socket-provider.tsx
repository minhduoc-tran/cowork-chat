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

    socket.on("message.updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    socket.on("message.deleted", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    // Conversation pin updated
    socket.on("pin:updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    // Conversation deleted (group disbanded)
    socket.on("conversation.deleted", () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    // Notification received (task assigned, mention, etc.)
    socket.on("notification.created", (payload) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })

      const actorName =
        payload?.actor?.displayName ?? t("socket.someone", "Ai đó")
      let message: string
      switch (payload?.type) {
        case "task_assigned":
          message = t("socket.taskAssigned", {
            name: actorName,
            title: payload?.data?.taskTitle ?? "",
          })
          break
        case "task_mention":
          message = t("socket.taskMention", { name: actorName })
          break
        case "message_mention":
          message = t("socket.messageMention", { name: actorName })
          break
        default:
          message = t("socket.newNotification", "Bạn có thông báo mới")
      }

      toast.info(message)
    })

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated, isHydrated, queryClient, t])

  return <>{children}</>
}
