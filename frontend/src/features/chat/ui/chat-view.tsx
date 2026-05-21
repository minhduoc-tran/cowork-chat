import * as React from "react"
import {
  CheckCheckIcon,
  CheckIcon,
  ReplyIcon,
  SendIcon,
  SmileIcon,
  XIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { useAuthStore } from "@/features/auth"

import type {
  ConversationMessageRecord,
  ConversationMessageReplyPreview,
} from "@/shared/api"
import {
  useConversationMessages,
  useDirectConversation,
  useFriends,
} from "@/shared/api"
import { getSocket } from "@/shared/lib/socket"
import { cn } from "@/shared/lib/utils"
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

  const targetUserId = userId ? Number(userId) : null
  const localConversationId =
    targetUserId !== null ? (conversationIdsByUser[targetUserId] ?? null) : null
  const { data: directConversation, isLoading: isConversationLoading } =
    useDirectConversation(targetUserId)
  const activeConversationId =
    localConversationId ?? directConversation?.conversation.id ?? null
  const { data: fetchedMessages, isLoading: isMessagesLoading } =
    useConversationMessages(activeConversationId)
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

  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const scrollToMessage = React.useCallback((messageId: number) => {
    const messageNode = messageRefs.current[messageId]

    if (!messageNode) return

    messageNode.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
    setHighlightState({
      userId: targetUserId,
      messageId,
    })

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current)
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightState((current) =>
        current.userId === targetUserId && current.messageId === messageId
          ? { userId: targetUserId, messageId: null }
          : current
      )
    }, 1800)
  }, [targetUserId])

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

    socket.on("message.received", handleMessage)
    socket.on("message.read", handleMessageRead)
    return () => {
      socket.off("message.received", handleMessage)
      socket.off("message.read", handleMessageRead)
    }
  }, [activeConversationId, localConversationId, targetUserId])

  // Auto-scroll to the actual Radix viewport after the new message is rendered.
  React.useLayoutEffect(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return

    const frameId = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight
    })

    return () => cancelAnimationFrame(frameId)
  }, [messages])

  // Mark messages as read when entering conversation
  React.useEffect(() => {
    if (!activeConversationId) return
    const socket = getSocket()
    if (!socket) return

    socket.emit("message.read", { conversationId: activeConversationId })
  }, [activeConversationId])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || !targetUserId) return

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
          <div className="text-xs text-muted-foreground">
            {friend?.isOnline ? t("chat.online") : t("chat.offline")}
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="relative min-h-0 flex-1 px-4" ref={scrollRef}>
        <div className="min-h-full space-y-3 py-4">
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
              <ContextMenu key={msg.id}>
                <ContextMenuTrigger asChild>
                  <div
                    ref={(node) => {
                      messageRefs.current[msg.id] = node
                    }}
                    className={cn(
                      "flex scroll-mt-24 rounded-3xl transition-shadow",
                      isMine ? "justify-end" : "justify-start",
                      highlightedMessageId === msg.id &&
                        "ring-2 ring-primary/35 ring-offset-2 ring-offset-background"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
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
                        {msg.content}
                      </p>
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
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-40">
                  <ContextMenuItem onSelect={() => setReplyDraft(msg)}>
                    <ReplyIcon className="size-4" />
                    {t("chat.replyAction")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t">
        {replyDraft && (
          <div className="flex items-start gap-3 border-b bg-muted/35 px-3 py-2">
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
        <div className="flex items-center gap-2 px-3 py-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
    </div>
  )
}

export default ChatView
