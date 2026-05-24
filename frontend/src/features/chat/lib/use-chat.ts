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
  useConversations,
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
  const { userId, conversationId } = useParams<{ userId?: string; conversationId?: string }>()
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
  const [isOtherUserTyping, setIsOtherUserTyping] = React.useState<
    boolean | string
  >(false)
  const [hasUnreadBelow, setHasUnreadBelow] = React.useState(false)

  const isTypingRef = React.useRef(false)
  const typingTimeoutRef = React.useRef<number | null>(null)

  const { data: conversationsData, isLoading: isLoadingConversations } =
    useConversations()
  const conversations = React.useMemo(
    () => conversationsData?.conversations ?? [],
    [conversationsData]
  )

  const targetUserId = conversationId
    ? Number(conversationId)
    : (userId ? Number(userId) : null)

  // Check if this is a group conversation (based on URL prefix/param)
  const groupConversation = isLoadingConversations
    ? null
    : conversationId
      ? conversations.find(
          (c) =>
            c.conversation.id === Number(conversationId) &&
            c.conversation.type === "group"
        )
      : null

  const localConversationId =
    targetUserId !== null && !conversationId
      ? (conversationIdsByUser[targetUserId] ?? null)
      : null

  // Only fetch direct conversation if conversations list is loaded and this is NOT a group
  const shouldFetchDirect =
    targetUserId !== null && !isLoadingConversations && !groupConversation

  const { data: directConversation, isLoading: isConversationLoading } =
    useDirectConversation(shouldFetchDirect ? targetUserId : null)

  const activeConversationId = groupConversation
    ? groupConversation.conversation.id
    : (localConversationId ?? directConversation?.conversation.id ?? null)

  const activeConversation =
    conversations.find((c) => c.conversation.id === activeConversationId) ??
    null

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

  const isLoading =
    isLoadingConversations || isConversationLoading || isMessagesLoading
  const mergedMessages = React.useMemo(
    () =>
      mergeMessages(
        fetchedMessages ?? [],
        targetUserId !== null ? (extraMessagesByUser[targetUserId] ?? []) : []
      ),
    [extraMessagesByUser, fetchedMessages, targetUserId]
  )
  const otherMember = directConversation?.members.find(
    (m) => m.userId === targetUserId
  )

  // Find other user in any group conversations we share
  const groupMemberInfo = React.useMemo(() => {
    if (!targetUserId || groupConversation || conversationId) return null
    for (const c of conversations) {
      const found = c.members.find((m) => m.userId === targetUserId)
      if (found) return found
    }
    return null
  }, [conversations, targetUserId, groupConversation, conversationId])

  const friend = groupConversation
    ? {
        id: groupConversation.conversation.id,
        displayName:
          groupConversation.conversation.name || t("chat.unnamedGroup"),
        avatar: null,
        isOnline: false,
        isGroup: true,
        memberCount: groupConversation.members.length,
      }
    : otherMember
      ? {
          id: otherMember.userId,
          displayName: otherMember.displayName,
          avatar: otherMember.avatar,
          isOnline: otherMember.isOnline,
          isGroup: false,
        }
      : friendsData?.friends.find((f) => f.friend.id === targetUserId)?.friend
        ? friendsData.friends.find((f) => f.friend.id === targetUserId)!.friend
        : groupMemberInfo
          ? {
              id: groupMemberInfo.userId,
              displayName: groupMemberInfo.displayName,
              avatar: groupMemberInfo.avatar,
              isOnline: groupMemberInfo.isOnline,
              isGroup: false,
            }
          : undefined
  const replyDraft =
    replyDraftState.userId === targetUserId ? replyDraftState.message : null

  const currentUserId = Number(currentUser?.id)

  const getSenderName = React.useCallback(
    (message: Pick<ChatMessage, "senderId" | "sender">) => {
      if (message.senderId === currentUserId) {
        return currentUser?.displayName ?? `User #${message.senderId}`
      }

      // 1. If group conversation, look up in activeConversation members
      if (
        activeConversation?.conversation?.type === "group" &&
        activeConversation.members
      ) {
        const member = activeConversation.members.find(
          (m) => m.userId === message.senderId
        )
        if (member) {
          return member.displayName
        }
      }

      // 2. If the message already contains the sender object (e.g. fetched from backend API)
      if (message.sender?.displayName) {
        return message.sender.displayName
      }

      // 3. Fallback to look up in friends
      const friendSender = friendsData?.friends.find(
        (f) => f.friend.id === message.senderId
      )?.friend
      if (friendSender) {
        return friendSender.displayName
      }

      return friend?.displayName ?? `User #${message.senderId}`
    },
    [
      currentUser?.displayName,
      currentUserId,
      friend?.displayName,
      activeConversation,
      friendsData,
    ]
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
    activeConversation,
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
        void queryClient.invalidateQueries({
          queryKey: ["conversations"],
        })
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
        void queryClient.invalidateQueries({
          queryKey: ["conversations"],
        })
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
    activeConversation,
  }
}
