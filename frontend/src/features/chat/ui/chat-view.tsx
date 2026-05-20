import * as React from "react"
import {
  CheckCheckIcon,
  CheckIcon,
  EllipsisIcon,
  ImageIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  StickerIcon,
  TypeIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { useAuthStore } from "@/features/auth"

import type { ConversationMessage } from "@/shared/api"
import {
  useConversationMessages,
  useDirectConversation,
  useFriends,
} from "@/shared/api"
import { getSocket } from "@/shared/lib/socket"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
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

type ChatMessage = ConversationMessage

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
  const scrollRef = React.useRef<HTMLDivElement>(null)

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
  const extraMessages =
    targetUserId !== null ? (extraMessagesByUser[targetUserId] ?? []) : []
  const messages = mergeMessages(fetchedMessages ?? [], extraMessages)
  const friend = friendsData?.friends.find(
    (f) => f.friend.id === targetUserId
  )?.friend

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

  // Listen for incoming messages
  React.useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleMessage = (payload: {
      conversation: { id: number }
      message: ChatMessage
    }) => {
      // Only add if it's for our conversation or from our target user
      if (
        (activeConversationId &&
          payload.conversation.id === activeConversationId) ||
        payload.message.senderId === targetUserId
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
          if (payload.message.senderId !== targetUserId) {
            const optimisticIndex = currentMessages.findIndex(
              (m) =>
                m.id > 1_000_000_000 &&
                m.content === payload.message.content &&
                m.senderId === payload.message.senderId
            )
            if (optimisticIndex !== -1) {
              const updated = [...currentMessages]
              updated[optimisticIndex] = payload.message
              return { ...prev, [targetUserId]: updated }
            }
          }

          if (
            currentMessages.some((message) => message.id === payload.message.id)
          ) {
            return prev
          }

          return {
            ...prev,
            [targetUserId]: [...currentMessages, payload.message],
          }
        })

        // Mark as read if the message is from the other user
        if (payload.message.senderId === targetUserId) {
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
      })
    } else {
      socket.emit("message.send", {
        targetUserId,
        content: trimmed,
      })
    }

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      conversationId: activeConversationId ?? 0,
      content: trimmed,
      senderId: Number(currentUser?.id),
      replyToId: null,
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
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
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
            const isMine = msg.senderId === Number(currentUser?.id)
            const isRead =
              isMine &&
              otherMemberLastReadId !== null &&
              msg.id <= otherMemberLastReadId
            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
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
            )
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t">
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b px-3 py-1.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sticker"
          >
            <StickerIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Image"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Attach file"
          >
            <PaperclipIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Format"
          >
            <TypeIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="More"
          >
            <EllipsisIcon className="size-4" />
          </button>
        </div>
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
