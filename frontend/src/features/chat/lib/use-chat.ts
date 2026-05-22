import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { useAuthStore } from "@/features/auth"

import type {
  ConversationMessageReplyPreview,
  ConversationPin,
} from "@/shared/api"
import {
  conversationApi,
  useConversationMessages,
  useDirectConversation,
  useFriends,
} from "@/shared/api"
import { getSocket } from "@/shared/lib/socket"

import { getScrollHintMode } from "../model/new-message-hint"

import type { ChatMessage } from "./chat-utils"
import { hydrateReplyPreviews, mergeMessages } from "./chat-utils"
import { useChatScroll } from "./use-chat-scroll"
import { useChatSocket } from "./use-chat-socket"

export function useChat() {
  const { t } = useTranslation()
  const { userId } = useParams<{ userId: string }>()
  const currentUser = useAuthStore((state) => state.user)
  const { data: friendsData } = useFriends()
  const queryClient = useQueryClient()

  const [input, setInput] = React.useState("")
  const [conversationIdsByUser, setConversationIdsByUser] = React.useState<
    Record<number, number>
  >({})
  const [extraMessagesByUser, setExtraMessagesByUser] = React.useState<
    Record<number, ChatMessage[]>
  >({})
  const [replyDraftState, setReplyDraftState] = React.useState<{
    userId: number | null
    message: ChatMessage | null
  }>({ userId: null, message: null })

  const [socketPins, setSocketPins] = React.useState<
    ConversationPin[] | undefined
  >(undefined)
  const [activePinIndex, setActivePinIndex] = React.useState(0)
  const [pinConfirmOpen, setPinConfirmOpen] = React.useState(false)
  const [unpinConfirmOpen, setUnpinConfirmOpen] = React.useState(false)
  const [recallConfirmOpen, setRecallConfirmOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [selectedMessage, setSelectedMessage] =
    React.useState<ChatMessage | null>(null)
  const [isOtherUserTyping, setIsOtherUserTyping] = React.useState(false)
  const [hasUnreadBelow, setHasUnreadBelow] = React.useState(false)

  const isTypingRef = React.useRef(false)
  const typingTimeoutRef = React.useRef<number | null>(null)

  const targetUserId = userId ? Number(userId) : null
  const localConversationId =
    targetUserId !== null ? (conversationIdsByUser[targetUserId] ?? null) : null
  const { data: directConversation, isLoading: isConversationLoading } =
    useDirectConversation(targetUserId)
  const activeConversationId =
    localConversationId ?? directConversation?.conversation.id ?? null

  const {
    data: fetchedMessagesData,
    isLoading: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(activeConversationId)

  const fetchedMessages = React.useMemo(
    () =>
      [...(fetchedMessagesData?.pages ?? [])]
        .reverse()
        .flatMap((page) => page.messages),
    [fetchedMessagesData]
  )

  const pins =
    socketPins !== undefined
      ? socketPins
      : (fetchedMessagesData?.pages[0]?.pins ?? [])
  const currentPin = pins[activePinIndex] ?? null

  const isLoading = isConversationLoading || isMessagesLoading
  const mergedMessages = React.useMemo(
    () =>
      mergeMessages(
        fetchedMessages ?? [],
        targetUserId !== null ? (extraMessagesByUser[targetUserId] ?? []) : []
      ),
    [extraMessagesByUser, fetchedMessages, targetUserId]
  )
  const friend = friendsData?.friends.find(
    (f) => f.friend.id === targetUserId
  )?.friend
  const replyDraft =
    replyDraftState.userId === targetUserId ? replyDraftState.message : null

  const currentUserId = Number(currentUser?.id)

  const getSenderName = React.useCallback(
    (message: Pick<ChatMessage, "senderId">) => {
      if (message.senderId === currentUserId) {
        return currentUser?.displayName ?? `User #${message.senderId}`
      }

      return friend?.displayName ?? `User #${message.senderId}`
    },
    [currentUser?.displayName, currentUserId, friend?.displayName]
  )

  const buildReplyPreview = React.useCallback(
    (message: ChatMessage): ConversationMessageReplyPreview => ({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: getSenderName(message),
      createdAt: message.createdAt,
    }),
    [getSenderName]
  )

  const messages = React.useMemo(
    () => hydrateReplyPreviews(mergedMessages, buildReplyPreview),
    [buildReplyPreview, mergedMessages]
  )

  const setReplyDraft = React.useCallback(
    (message: ChatMessage | null) => {
      setReplyDraftState({
        userId: targetUserId,
        message,
      })
    },
    [targetUserId]
  )

  const apiLastReadId = React.useMemo(() => {
    if (!directConversation || !currentUser) return null
    const otherMember = directConversation.members.find(
      (m) => m.userId !== Number(currentUser.id)
    )
    return otherMember?.lastReadMessageId ?? null
  }, [directConversation, currentUser])

  const [realtimeLastReadId, setRealtimeLastReadId] = React.useState<
    number | null
  >(null)

  const otherMemberLastReadId =
    realtimeLastReadId !== null && apiLastReadId !== null
      ? Math.max(realtimeLastReadId, apiLastReadId)
      : (realtimeLastReadId ?? apiLastReadId)

  // Scroll anchoring & viewport scroll operations hook
  const {
    scrollRef,
    messageRefs,
    showScrollToBottom,
    highlightState,
    scrollToMessage,
    handleScrollToBottom,
  } = useChatScroll({
    activeConversationId,
    targetUserId,
    currentUserId,
    messages,
    isOtherUserTyping,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    setHasUnreadBelow,
  })

  // Socket listener registration hook
  useChatSocket({
    activeConversationId,
    targetUserId,
    localConversationId,
    currentUser: currentUser
      ? { id: Number(currentUser.id), displayName: currentUser.displayName }
      : null,
    setConversationIdsByUser,
    setExtraMessagesByUser,
    setRealtimeLastReadId,
    setSocketPins,
    setActivePinIndex,
    setIsOtherUserTyping,
  })

  const highlightedMessageId =
    highlightState.userId === targetUserId ? highlightState.messageId : null

  const stopTyping = React.useCallback(() => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (isTypingRef.current && activeConversationId) {
      const socket = getSocket()
      if (socket && socket.connected) {
        socket.emit("typing.stop", { conversationId: activeConversationId })
      }
    }
    isTypingRef.current = false
  }, [activeConversationId])

  // Reset page states and references when changing conversation target user
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocketPins(undefined)
    setActivePinIndex(0)
    setPinConfirmOpen(false)
    setUnpinConfirmOpen(false)
    setSelectedMessage(null)
    setIsOtherUserTyping(false)
    setHasUnreadBelow(false)
  }, [targetUserId])

  // Stop typing on leave/unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      if (isTypingRef.current && activeConversationId) {
        const socket = getSocket()
        if (socket && socket.connected) {
          socket.emit("typing.stop", { conversationId: activeConversationId })
        }
      }
      isTypingRef.current = false
    }
  }, [activeConversationId])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || !targetUserId) return

    stopTyping()

    const socket = getSocket()
    if (!socket) return

    if (activeConversationId) {
      socket.emit("message.send", {
        conversationId: activeConversationId,
        content: trimmed,
        replyToId: replyDraft?.id,
      })
    } else {
      socket.emit("message.send", {
        targetUserId,
        content: trimmed,
        replyToId: replyDraft?.id,
      })
    }

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      conversationId: activeConversationId ?? 0,
      content: trimmed,
      senderId: Number(currentUser?.id),
      replyToId: replyDraft?.id ?? null,
      replyTo: replyDraft ? buildReplyPreview(replyDraft) : null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      type: "text",
      updatedAt: new Date().toISOString(),
    }
    setExtraMessagesByUser((prev) => {
      if (targetUserId === null) return prev

      return {
        ...prev,
        [targetUserId]: [...(prev[targetUserId] ?? []), optimisticMsg],
      }
    })
    setInput("")
    setReplyDraft(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)

    if (!activeConversationId) return

    const socket = getSocket()
    if (!socket) return

    if (val.trim() === "") {
      stopTyping()
      return
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit("typing.start", { conversationId: activeConversationId })
    }

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping()
    }, 3500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePinConfirm = async () => {
    if (!activeConversationId || !selectedMessage) return
    try {
      const res = await conversationApi.pinMessage(
        activeConversationId,
        selectedMessage.id
      )
      if (res.data.success && res.data.data) {
        setSocketPins(res.data.data.pins)
        void queryClient.invalidateQueries({
          queryKey: ["conversations"],
        })
        toast.success(t("chat.pinSuccess"))
      } else {
        toast.error(t("chat.pinError"))
      }
    } catch (error) {
      console.error("Failed to pin message:", error)
      toast.error(t("chat.pinError"))
    } finally {
      setPinConfirmOpen(false)
      setSelectedMessage(null)
    }
  }

  const handleUnpinConfirm = async () => {
    if (!activeConversationId) return
    const msgIdToUnpin = selectedMessage?.id ?? currentPin?.messageId
    if (!msgIdToUnpin) return
    try {
      const res = await conversationApi.unpinMessage(
        activeConversationId,
        msgIdToUnpin
      )
      if (res.data.success && res.data.data) {
        setSocketPins(res.data.data.pins)
        setActivePinIndex((prev) =>
          Math.max(0, Math.min(prev, res.data.data!.pins.length - 1))
        )
        void queryClient.invalidateQueries({
          queryKey: ["conversations"],
        })
        toast.success(t("chat.unpinSuccess"))
      } else {
        toast.error(t("chat.unpinError"))
      }
    } catch (error) {
      console.error("Failed to unpin message:", error)
      toast.error(t("chat.unpinError"))
    } finally {
      setUnpinConfirmOpen(false)
      setSelectedMessage(null)
    }
  }

  const handleRecallConfirm = async () => {
    if (!activeConversationId || !selectedMessage) return
    try {
      const res = await conversationApi.recallMessage(
        activeConversationId,
        selectedMessage.id
      )
      if (res.data.success) {
        toast.success(t("chat.recallSuccess"))
      } else {
        toast.error(t("chat.recallError"))
      }
    } catch (error) {
      console.error("Failed to recall message:", error)
      toast.error(t("chat.recallError"))
    } finally {
      setRecallConfirmOpen(false)
      setSelectedMessage(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!activeConversationId || !selectedMessage) return
    try {
      const res = await conversationApi.deleteMessage(
        activeConversationId,
        selectedMessage.id
      )
      if (res.data.success) {
        toast.success(t("chat.deleteSuccess"))
      } else {
        toast.error(t("chat.deleteError"))
      }
    } catch (error) {
      console.error("Failed to delete message:", error)
      toast.error(t("chat.deleteError"))
    } finally {
      setDeleteConfirmOpen(false)
      setSelectedMessage(null)
    }
  }

  const scrollHintMode = getScrollHintMode({
    showScrollHint: showScrollToBottom,
    hasUnreadBelow,
  })

  return {
    t,
    currentUser,
    currentUserId,
    friend,
    isLoading,
    targetUserId,
    activeConversationId,
    messages,
    pins,
    currentPin,
    activePinIndex,
    setActivePinIndex,
    input,
    setInput,
    handleInputChange,
    handleKeyDown,
    handleSend,
    replyDraft,
    setReplyDraft,
    isOtherUserTyping,
    scrollRef,
    messageRefs,
    showScrollToBottom,
    highlightedMessageId,
    scrollToMessage,
    handleScrollToBottom,
    scrollHintMode,
    pinConfirmOpen,
    setPinConfirmOpen,
    unpinConfirmOpen,
    setUnpinConfirmOpen,
    recallConfirmOpen,
    setRecallConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    selectedMessage,
    setSelectedMessage,
    handlePinConfirm,
    handleUnpinConfirm,
    handleRecallConfirm,
    handleDeleteConfirm,
    otherMemberLastReadId,
    getSenderName,
    isFetchingNextPage,
  }
}
