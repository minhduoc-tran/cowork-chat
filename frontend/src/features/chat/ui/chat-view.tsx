import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowDown,
  CheckCheckIcon,
  CheckIcon,
  PinIcon,
  PinOffIcon,
  ReplyIcon,
  SendIcon,
  SmileIcon,
  XIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { useAuthStore } from "@/features/auth"
import {
  getScrollHintMode,
  shouldMarkUnreadBelow,
} from "@/features/chat/model/new-message-hint"

import type {
  ConversationMessageRecord,
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
import { cn } from "@/shared/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu"
import { ScrollArea } from "@/shared/ui/scroll-area"

function formatTime(dateValue: string | Date | unknown): string {
  if (!dateValue) return ""
  const date = new Date(dateValue as string | number | Date)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Split message text into plain-text and URL segments,
 * rendering URLs as clickable <a> tags with an underline hover effect.
 */
function renderMessageContent(
  content: string | null,
  isMine: boolean
): React.ReactNode {
  if (!content) return null
  const urlRegex = /https?:\/\/[^\s]+/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = urlRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const url = match[0]
    parts.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "cursor-pointer break-all underline underline-offset-2",
          isMine ? "text-primary-foreground/90" : "text-primary"
        )}
      >
        {url}
      </a>
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  return parts
}

type ChatMessage = ConversationMessageRecord

function getScrollViewport(scrollRoot: HTMLDivElement | null) {
  return scrollRoot?.querySelector(
    '[data-slot="scroll-area-viewport"]'
  ) as HTMLDivElement | null
}

function mergeMessages(
  baseMessages: ChatMessage[],
  extraMessages: ChatMessage[]
): ChatMessage[] {
  const merged = new Map<number, ChatMessage>()

  for (const message of baseMessages) {
    merged.set(message.id, message)
  }

  for (const message of extraMessages) {
    // Skip optimistic messages that already exist in base (matched by content + sender)
    if (message.id > 1_000_000_000) {
      const alreadyFetched = baseMessages.some(
        (base) =>
          base.content === message.content &&
          base.senderId === message.senderId &&
          base.replyToId === message.replyToId &&
          Math.abs(
            new Date(base.createdAt).getTime() -
              new Date(message.createdAt).getTime()
          ) < 5000
      )
      if (alreadyFetched) continue
    }
    merged.set(message.id, message)
  }

  return Array.from(merged.values()).sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}

function hydrateReplyPreviews(
  messages: ChatMessage[],
  buildReplyPreview: (message: ChatMessage) => ConversationMessageReplyPreview
): ChatMessage[] {
  const messagesById = new Map(messages.map((message) => [message.id, message]))

  return messages.map((message) => {
    if (message.replyTo || !message.replyToId) {
      return message
    }

    const repliedMessage = messagesById.get(message.replyToId)

    if (!repliedMessage) {
      return message
    }

    return {
      ...message,
      replyTo: buildReplyPreview(repliedMessage),
    }
  })
}

function getMessagePreview(
  content: string | null,
  fallback: string,
  maxLength = 90
) {
  const normalized = content?.trim()

  if (!normalized) return fallback
  if (normalized.length <= maxLength) return normalized

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export function ChatView() {
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
  const [highlightState, setHighlightState] = React.useState<{
    userId: number | null
    messageId: number | null
  }>({ userId: null, messageId: null })
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const messageRefs = React.useRef<Record<number, HTMLDivElement | null>>({})
  const highlightTimeoutRef = React.useRef<number | null>(null)

  const lastScrollHeightRef = React.useRef(0)
  const lastScrollTopRef = React.useRef(0)
  const prevConversationIdRef = React.useRef<number | null>(null)
  const lastMessageIdRef = React.useRef<number | null>(null)
  const firstMessageIdRef = React.useRef<number | null>(null)

  const [socketPin, setSocketPin] = React.useState<ConversationPin | null | undefined>(undefined)
  const [pinConfirmOpen, setPinConfirmOpen] = React.useState(false)
  const [unpinConfirmOpen, setUnpinConfirmOpen] = React.useState(false)
  const [selectedMessage, setSelectedMessage] = React.useState<ChatMessage | null>(null)
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false)
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
    () => [...(fetchedMessagesData?.pages ?? [])].reverse().flatMap((page) => page.messages),
    [fetchedMessagesData]
  )
  const activePin = socketPin !== undefined ? socketPin : (fetchedMessagesData?.pages[0]?.pin ?? null)

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
  const highlightedMessageId =
    highlightState.userId === targetUserId ? highlightState.messageId : null

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

  // Get the other member's lastReadMessageId for read receipts
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
  const scrollHintMode = getScrollHintMode({
    showScrollHint: showScrollToBottom,
    hasUnreadBelow,
  })

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

  React.useEffect(() => {
    setSocketPin(undefined)
    setPinConfirmOpen(false)
    setUnpinConfirmOpen(false)
    setSelectedMessage(null)
    setShowScrollToBottom(false)
    setIsOtherUserTyping(false)
    setHasUnreadBelow(false)
  }, [targetUserId])

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

  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const scrollToMessage = React.useCallback(
    (messageId: number) => {
      const targetId = Number(messageId)
      const messageNode = messageRefs.current[targetId]

      if (!messageNode) {
        console.warn(`Message node not found for ID: ${targetId}`)
        return
      }

      requestAnimationFrame(() => {
        const viewport = getScrollViewport(scrollRef.current)
        if (viewport) {
          const viewportRect = viewport.getBoundingClientRect()
          const nodeRect = messageNode.getBoundingClientRect()
          const relativeTop = nodeRect.top - viewportRect.top + viewport.scrollTop
          const targetScrollTop = relativeTop - viewportRect.height / 2 + nodeRect.height / 2

          viewport.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          })
        } else {
          messageNode.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }
      })

      setHighlightState({
        userId: targetUserId,
        messageId: targetId,
      })

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightState((current) =>
          current.userId === targetUserId && current.messageId === targetId
            ? { userId: targetUserId, messageId: null }
            : current
        )
      }, 1800)
    },
    [targetUserId]
  )

  const handleScrollToBottom = React.useCallback(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return
    setHasUnreadBelow(false)
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    })
  }, [])

  // Listen for incoming messages
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

      // Only add if it's for our conversation or from our target user
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

          // If this is our own message echoed back, replace the optimistic one
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

        // Mark as read if the message is from the other user
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
      // Update read status if the other user read our messages
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
        if (targetUserId === null) return

        setExtraMessagesByUser((prev) => {
          const currentMessages = prev[targetUserId] ?? []
          const idx = currentMessages.findIndex(
            (m) => m.id === updatedMessage.id
          )
          if (idx !== -1) {
            const updated = [...currentMessages]
            updated[idx] = updatedMessage
            return { ...prev, [targetUserId]: updated }
          }
          return prev
        })

        void queryClient.invalidateQueries({
          queryKey: ["conversations", activeConversationId, "messages"],
        })
      }
    }

    const handlePinUpdated = (payload: {
      conversationId: number
      pin: ConversationPin | null
    }) => {
      if (payload.conversationId === activeConversationId) {
        setSocketPin(payload.pin)
        void queryClient.invalidateQueries({
          queryKey: ["conversations", activeConversationId, "messages"],
        })
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
    socket.on("conversation.pin.updated", handlePinUpdated)
    socket.on("typing.updated", handleTypingUpdated)
    return () => {
      socket.off("message.received", handleMessage)
      socket.off("message.read", handleMessageRead)
      socket.off("message.updated", handleMessageUpdated)
      socket.off("conversation.pin.updated", handlePinUpdated)
      socket.off("typing.updated", handleTypingUpdated)
    }
  }, [
    activeConversationId,
    localConversationId,
    targetUserId,
    queryClient,
    currentUser,
  ])

  // Register scroll listener on the ScrollArea's viewport to trigger fetchNextPage() when scrolling near the top
  React.useEffect(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return

    const handleScroll = () => {
      // Record scroll metrics for anchoring
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop

      // Show/hide scroll to bottom button
      const isNearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 300
      setShowScrollToBottom(!isNearBottom)
      if (isNearBottom) {
        setHasUnreadBelow(false)
      }

      // Trigger fetchNextPage when scrolling near top (scrollTop < 100)
      if (
        viewport.scrollTop < 100 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        void fetchNextPage()
      }
    }

    // Initialize state
    const isNearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 300
    setShowScrollToBottom(!isNearBottom)

    viewport.addEventListener("scroll", handleScroll)
    return () => {
      viewport.removeEventListener("scroll", handleScroll)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Auto-scroll or anchor scroll position after messages change
  React.useLayoutEffect(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return

    const prevConvId = prevConversationIdRef.current
    const prevLastMsgId = lastMessageIdRef.current
    const prevFirstMsgId = firstMessageIdRef.current

    // Update refs
    prevConversationIdRef.current = activeConversationId

    const lastMsg = messages[messages.length - 1]
    const lastMsgId = lastMsg?.id ?? null
    lastMessageIdRef.current = lastMsgId

    const firstMsg = messages[0]
    const firstMsgId = firstMsg?.id ?? null
    firstMessageIdRef.current = firstMsgId

    // 1. If conversation changed, scroll to bottom
    if (activeConversationId !== prevConvId) {
      viewport.scrollTop = viewport.scrollHeight
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop
      return
    }

    // If there were no messages before, and now there are, scroll to bottom
    if (messages.length > 0 && prevLastMsgId === null) {
      viewport.scrollTop = viewport.scrollHeight
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop
      return
    }

    // 2. Determine if a new message was added at the bottom
    const wasNewMessageAdded = lastMsgId !== null && lastMsgId !== prevLastMsgId
    const wasAtBottom =
      lastScrollHeightRef.current - lastScrollTopRef.current - viewport.clientHeight < 150

    if (wasNewMessageAdded) {
      const isMyMessage = lastMsg.senderId === currentUserId
      if (
        shouldMarkUnreadBelow({
          wasNewMessageAdded,
          isMyMessage,
          wasAtBottom,
        })
      ) {
        setHasUnreadBelow(true)
      }

      if (isMyMessage || wasAtBottom) {
        setHasUnreadBelow(false)
        viewport.scrollTop = viewport.scrollHeight
      }
    } else if (isOtherUserTyping && wasAtBottom) {
      viewport.scrollTop = viewport.scrollHeight
    } else {
      // 3. Prepend anchor: messages changed but last message ID didn't change (older messages prepended)
      const wasPrepended = prevFirstMsgId !== null && firstMsgId !== prevFirstMsgId
      if (wasPrepended) {
        const delta = viewport.scrollHeight - lastScrollHeightRef.current
        if (delta > 0) {
          viewport.scrollTop = lastScrollTopRef.current + delta
        }
      }
    }

    // Update tracking refs
    lastScrollHeightRef.current = viewport.scrollHeight
    lastScrollTopRef.current = viewport.scrollTop
  }, [messages, activeConversationId, currentUserId, isOtherUserTyping])

  // Join conversation room, set active conversation, and mark messages as read when entering conversation or on reconnect
  React.useEffect(() => {
    if (!activeConversationId) return
    const socket = getSocket()
    if (!socket) return

    const handleConnect = () => {
      socket.emit("conversation.join", { conversationId: activeConversationId })
      socket.emit("presence.set-active-conversation", { conversationId: activeConversationId })
      socket.emit("message.read", { conversationId: activeConversationId })
    }

    // Join immediately if already connected
    if (socket.connected) {
      handleConnect()
    }

    socket.on("connect", handleConnect)

    return () => {
      socket.off("connect", handleConnect)
      // When leaving the conversation or unmounting, clear the active conversation in presence state
      if (socket.connected) {
        socket.emit("presence.set-active-conversation", { conversationId: null })
      }
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
      const res = await conversationApi.pinMessage(activeConversationId, selectedMessage.id)
      if (res.data.success && res.data.data) {
        setSocketPin(res.data.data.pin)
        void queryClient.invalidateQueries({
          queryKey: ["conversations", activeConversationId, "messages"],
        })
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
    try {
      const res = await conversationApi.unpinMessage(activeConversationId)
      if (res.data.success) {
        setSocketPin(null)
        void queryClient.invalidateQueries({
          queryKey: ["conversations", activeConversationId, "messages"],
        })
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

  if (!targetUserId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        {t("chat.selectFriend")}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 py-0">
        <Avatar className="h-9 w-9 rounded-full">
          <AvatarImage
            src={friend?.avatar ?? undefined}
            alt={friend?.displayName}
          />
          <AvatarFallback className="rounded-full text-sm">
            {friend?.displayName?.slice(0, 2).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {friend?.displayName ?? `User #${targetUserId}`}
          </div>
          <div className={cn(
            "text-xs text-muted-foreground transition-all duration-200",
            isOtherUserTyping && "text-primary font-medium animate-pulse"
          )}>
            {isOtherUserTyping
              ? t("chat.typing", { name: friend?.displayName })
              : friend?.isOnline
              ? t("chat.online")
              : t("chat.offline")}
          </div>
        </div>
      </header>

      {activePin && (
        <div className="flex h-12 shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-1.5 text-xs">
          <div
            onClick={() => {
              const msgId = Number(activePin.messageId)
              const msgExists = messages.some((m) => Number(m.id) === msgId)
              if (msgExists) {
                scrollToMessage(msgId)
              } else {
                toast.info(t("chat.pinNoticeTooOld"))
              }
            }}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
            title={`Pinned by ${activePin.pinnedByName} at ${formatTime(activePin.pinnedAt)}`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PinIcon className="size-4 rotate-45" />
            </div>
            <div className="min-w-0 flex-1 border-l-2 border-primary/55 pl-2.5">
              <div className="truncate font-semibold text-primary">
                {t("chat.pinnedLabel")}
              </div>
              <div className="truncate text-muted-foreground text-[11px] mt-0.5">
                <span className="font-medium text-foreground">
                  {activePin.messagePreview.senderName}:
                </span>{" "}
                {getMessagePreview(
                  activePin.messagePreview.content,
                  t("chat.messageUnavailable"),
                  70
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const matchingMsg = messages.find((m) => m.id === activePin.messageId)
              if (matchingMsg) {
                setSelectedMessage(matchingMsg)
              } else {
                setSelectedMessage({
                  id: activePin.messageId,
                  conversationId: activePin.conversationId,
                  senderId: activePin.messagePreview.senderId,
                  content: activePin.messagePreview.content,
                  type: "text",
                  replyToId: null,
                  replyTo: null,
                  isEdited: false,
                  isDeleted: false,
                  createdAt: activePin.messagePreview.createdAt,
                  updatedAt: activePin.messagePreview.createdAt,
                })
              }
              setUnpinConfirmOpen(true)
            }}
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Unpin message"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="relative min-h-0 flex-1 px-4" ref={scrollRef}>
        <div className="min-h-full space-y-3 py-4">
          {isFetchingNextPage && (
            <div className="py-2 text-center text-xs text-muted-foreground">
              {t("chat.loading")}...
            </div>
          )}
          {isLoading && (
            <div className="text-center text-sm text-muted-foreground">
              {t("chat.loading")}
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t("chat.noMessages")}
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUserId
            const isRead =
              isMine &&
              otherMemberLastReadId !== null &&
              msg.id <= otherMemberLastReadId
            return (
              <div
                key={msg.id}
                ref={(node) => {
                  messageRefs.current[msg.id] = node
                }}
                className={cn(
                  "flex scroll-mt-24 rounded-3xl",
                  isMine ? "justify-end" : "justify-start"
                )}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 text-sm transition-shadow",
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                        highlightedMessageId === msg.id &&
                          "ring-2 ring-primary/35 ring-offset-2 ring-offset-background"
                      )}
                    >
                      {msg.replyTo && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(msg.replyTo!.id)}
                          className={cn(
                            "mb-2 block w-full rounded-lg border-l-2 px-3 py-2 text-left transition-colors",
                            isMine
                              ? "border-primary-foreground/55 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                              : "border-primary/55 bg-background/70 hover:bg-background"
                          )}
                        >
                          <div
                            className={cn(
                              "truncate text-[11px] font-semibold",
                              isMine
                                ? "text-primary-foreground/85"
                                : "text-primary"
                            )}
                          >
                            {msg.replyTo.senderName}
                          </div>
                          <div
                            className={cn(
                              "truncate text-[11px]",
                              isMine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {getMessagePreview(
                              msg.replyTo.content,
                              t("chat.messageUnavailable")
                            )}
                          </div>
                        </button>
                      )}

                      <p className="wrap-break-word whitespace-pre-wrap">
                        {renderMessageContent(msg.content, isMine)}
                      </p>

                      {msg.linkPreview && (
                        <a
                          href={msg.linkPreview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "group mt-2 block cursor-pointer border-l-[3px] pl-3 text-left",
                            isMine
                              ? "border-primary-foreground/60"
                              : "border-primary"
                          )}
                        >
                          <div>
                            {msg.linkPreview.siteName && (
                              <div
                                className={cn(
                                  "text-[10px] font-bold tracking-wide uppercase",
                                  isMine
                                    ? "text-primary-foreground/90"
                                    : "text-primary"
                                )}
                              >
                                {msg.linkPreview.siteName}
                              </div>
                            )}
                            {msg.linkPreview.title && (
                              <div
                                className={cn(
                                  "mt-0.5 line-clamp-2 text-xs leading-tight font-bold",
                                  isMine
                                    ? "text-primary-foreground"
                                    : "text-foreground"
                                )}
                              >
                                {msg.linkPreview.title}
                              </div>
                            )}
                            {msg.linkPreview.description && (
                              <div
                                className={cn(
                                  "mt-1 line-clamp-3 text-[11px] leading-normal",
                                  isMine
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {msg.linkPreview.description}
                              </div>
                            )}
                            {msg.linkPreview.imageUrl && (
                              <div className="mt-2.5 aspect-video w-full max-w-[360px] overflow-hidden rounded-lg">
                                <img
                                  src={msg.linkPreview.imageUrl}
                                  alt={msg.linkPreview.title || "Preview"}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.parentElement?.remove()
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </a>
                      )}
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1 text-[10px]",
                          isMine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatTime(msg.createdAt)}
                        {isMine &&
                          (isRead ? (
                            <CheckCheckIcon className="size-3.5" />
                          ) : (
                            <CheckIcon className="size-3.5" />
                          ))}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem onSelect={() => setReplyDraft(msg)}>
                      <ReplyIcon className="size-4" />
                      {t("chat.replyAction")}
                    </ContextMenuItem>
                    {activePin?.messageId === msg.id ? (
                      <ContextMenuItem
                        onSelect={() => {
                          setSelectedMessage(msg)
                          setUnpinConfirmOpen(true)
                        }}
                      >
                        <PinOffIcon className="size-4" />
                        {t("chat.unpinAction")}
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem
                        onSelect={() => {
                          setSelectedMessage(msg)
                          setPinConfirmOpen(true)
                        }}
                      >
                        <PinIcon className="size-4" />
                        {t("chat.pinAction")}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            )
          })}

        </div>
        {scrollHintMode !== "hidden" && (
          <button
            type="button"
            onClick={handleScrollToBottom}
            className={cn(
              "absolute bottom-4 right-6 z-10 inline-flex items-center justify-center rounded-full border backdrop-blur-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
              scrollHintMode === "unread"
                ? "h-10 gap-2 border-primary/30 bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                : "h-10 w-10 bg-background/90 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label={t("chat.scrollToBottom") || "Scroll to bottom"}
          >
            <ArrowDown className="size-4" />
            {scrollHintMode === "unread" ? (
              <span>{t("chat.newMessagesBelow")}</span>
            ) : null}
          </button>
        )}
      </ScrollArea>

      {/* Input */}
      <div className={cn("shrink-0", !isOtherUserTyping && "border-t")}>
        {isOtherUserTyping && (
          <div className="px-4 pt-2.5 pb-0.5 text-xs font-semibold text-primary animate-pulse animate-in fade-in duration-200">
            {t("chat.typing", { name: friend?.displayName })}
          </div>
        )}
        {replyDraft && (
          <div className={cn(
            "flex items-start gap-3 border-b bg-muted/35 px-3 py-2",
            isOtherUserTyping && "border-t"
          )}>
            <button
              type="button"
              onClick={() => scrollToMessage(replyDraft.id)}
              className="min-w-0 flex-1 rounded-md border-l-2 border-primary/60 px-3 py-1.5 text-left transition-colors hover:bg-background/80"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ReplyIcon className="size-3.5" />
                {t("chat.replyingTo", { name: getSenderName(replyDraft) })}
              </div>
              <div className="truncate pt-0.5 text-sm text-foreground">
                {getMessagePreview(
                  replyDraft.content,
                  t("chat.messageUnavailable")
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setReplyDraft(null)}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Cancel reply"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}
        {/* Message input */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2.5",
          isOtherUserTyping && !replyDraft && "border-t"
        )}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.inputPlaceholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Emoji"
          >
            <SmileIcon className="size-5" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <SendIcon className="size-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Pin confirmation dialog */}
      <AlertDialog open={pinConfirmOpen} onOpenChange={setPinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.pinDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.pinDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPinConfirmOpen(false)
              setSelectedMessage(null)
            }}>
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePinConfirm}>
              {t("chat.pinAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpin confirmation dialog */}
      <AlertDialog open={unpinConfirmOpen} onOpenChange={setUnpinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.unpinDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.unpinDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUnpinConfirmOpen(false)
              setSelectedMessage(null)
            }}>
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleUnpinConfirm}>
              {t("chat.unpinAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChatView
