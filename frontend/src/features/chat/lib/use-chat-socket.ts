import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import type {
  ConversationMessageReplyPreview,
  ConversationPin,
} from "@/shared/api"
import { getSocket } from "@/shared/lib/socket"

import type { ChatMessage } from "./chat-utils"

interface UseChatSocketOptions {
  activeConversationId: number | null
  targetUserId: number | null
  localConversationId: number | null
  currentUser: { id: number; displayName: string } | null
  setConversationIdsByUser: React.Dispatch<React.SetStateAction<Record<number, number>>>
  setExtraMessagesByUser: React.Dispatch<React.SetStateAction<Record<number, ChatMessage[]>>>
  setRealtimeLastReadId: (val: number | null) => void
  setSocketPins: (val: ConversationPin[] | undefined) => void
  setActivePinIndex: React.Dispatch<React.SetStateAction<number>>
  setIsOtherUserTyping: (val: boolean) => void
}

export function useChatSocket({
  activeConversationId,
  targetUserId,
  localConversationId,
  currentUser,
  setConversationIdsByUser,
  setExtraMessagesByUser,
  setRealtimeLastReadId,
  setSocketPins,
  setActivePinIndex,
  setIsOtherUserTyping,
}: UseChatSocketOptions) {
  const queryClient = useQueryClient()

  // 1. Handle room joins, active conversation presence, and initial read receipt
  React.useEffect(() => {
    if (!activeConversationId) return
    const socket = getSocket()
    if (!socket) return

    const handleConnect = () => {
      socket.emit("conversation.join", { conversationId: activeConversationId })
      socket.emit("presence.set-active-conversation", { conversationId: activeConversationId })
      socket.emit("message.read", { conversationId: activeConversationId })
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on("connect", handleConnect)

    return () => {
      socket.off("connect", handleConnect)
      if (socket.connected) {
        socket.emit("presence.set-active-conversation", { conversationId: null })
      }
    }
  }, [activeConversationId])

  // 2. Realtime socket event listeners
  React.useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleMessage = (payload: {
      conversation: { id: number }
      message: Omit<ChatMessage, "replyTo">
      replyTo: ConversationMessageReplyPreview | null
    }) => {
      const nextMessage: ChatMessage = {
        ...payload.message,
        replyTo: payload.replyTo,
      }

      if (
        (activeConversationId &&
          payload.conversation.id === activeConversationId) ||
        nextMessage.senderId === targetUserId
      ) {
        if (targetUserId !== null && !localConversationId) {
          setConversationIdsByUser((prev) => ({
            ...prev,
            [targetUserId]: payload.conversation.id,
          }))
        }
        if (targetUserId === null) return

        setExtraMessagesByUser((prev) => {
          const currentMessages = prev[targetUserId] ?? []

          if (nextMessage.senderId !== targetUserId) {
            const optimisticIndex = currentMessages.findIndex(
              (m) =>
                m.id > 1_000_000_000 &&
                m.content === nextMessage.content &&
                m.senderId === nextMessage.senderId &&
                m.replyToId === nextMessage.replyToId
            )
            if (optimisticIndex !== -1) {
              const updated = [...currentMessages]
              updated[optimisticIndex] = nextMessage
              return { ...prev, [targetUserId]: updated }
            }
          }

          if (
            currentMessages.some((message) => message.id === nextMessage.id)
          ) {
            return prev
          }

          return {
            ...prev,
            [targetUserId]: [...currentMessages, nextMessage],
          }
        })

        if (nextMessage.senderId === targetUserId) {
          socket.emit("message.read", {
            conversationId: payload.conversation.id,
          })
        }
      }
    }

    const handleMessageRead = (payload: {
      conversationId: number
      userId: number
      lastReadMessageId: number
    }) => {
      if (
        payload.userId === targetUserId &&
        payload.conversationId === activeConversationId
      ) {
        setRealtimeLastReadId(payload.lastReadMessageId)
      }
    }

    const handleMessageUpdated = (payload: {
      message: ChatMessage
      replyTo: ConversationMessageReplyPreview | null
    }) => {
      const updatedMessage: ChatMessage = {
        ...payload.message,
        replyTo: payload.replyTo,
      }

      if (
        (activeConversationId &&
          updatedMessage.conversationId === activeConversationId) ||
        updatedMessage.senderId === targetUserId ||
        (currentUser && updatedMessage.senderId === Number(currentUser.id))
      ) {
        setExtraMessagesByUser((prev) => {
          if (targetUserId === null) return prev
          const currentMessages = prev[targetUserId] ?? []
          const index = currentMessages.findIndex((m) => m.id === updatedMessage.id)
          if (index !== -1) {
            const updated = [...currentMessages]
            updated[index] = updatedMessage
            return { ...prev, [targetUserId]: updated }
          }
          return prev
        })
      }
    }

    const handlePinUpdated = (payload: {
      conversationId: number
      pins: ConversationPin[]
    }) => {
      if (payload.conversationId === activeConversationId) {
        setSocketPins(payload.pins)
        setActivePinIndex((prev) => Math.min(prev, Math.max(0, payload.pins.length - 1)))
        queryClient.setQueryData(["pins", activeConversationId], payload.pins)
      }
      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      })
    }

    const handleTypingUpdated = (payload: {
      conversationId: number
      userId: number
      isTyping: boolean
    }) => {
      if (payload.userId !== targetUserId) return

      if (targetUserId !== null && !localConversationId) {
        setConversationIdsByUser((prev) =>
          prev[targetUserId] === payload.conversationId
            ? prev
            : { ...prev, [targetUserId]: payload.conversationId }
        )
      }

      if (
        activeConversationId === null ||
        payload.conversationId === activeConversationId
      ) {
        setIsOtherUserTyping(payload.isTyping)
      }
    }

    socket.on("message.received", handleMessage)
    socket.on("message.read", handleMessageRead)
    socket.on("message.updated", handleMessageUpdated)
    socket.on("pin:updated", handlePinUpdated)
    socket.on("typing.updated", handleTypingUpdated)

    return () => {
      socket.off("message.received", handleMessage)
      socket.off("message.read", handleMessageRead)
      socket.off("message.updated", handleMessageUpdated)
      socket.off("pin:updated", handlePinUpdated)
      socket.off("typing.updated", handleTypingUpdated)
    }
  }, [
    activeConversationId,
    localConversationId,
    targetUserId,
    queryClient,
    currentUser,
    setConversationIdsByUser,
    setExtraMessagesByUser,
    setRealtimeLastReadId,
    setSocketPins,
    setActivePinIndex,
    setIsOtherUserTyping,
  ])
}
