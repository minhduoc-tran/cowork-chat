import * as React from "react"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import {
  ArrowDown,
  ArrowRight,
  CheckCheckIcon,
  CheckIcon,
  Copy,
  PinIcon,
  PinOffIcon,
  Plus,
  ReplyIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { ConversationListItem, ConversationPin } from "@/shared/api"
import { useToggleMessageReaction } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/shared/ui/hover-card"
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover"
import { ScrollArea } from "@/shared/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { UserProfileDialog } from "@/shared/ui/user-profile-dialog"

import type { ChatMessage } from "../lib/chat-utils"
import {
  formatTime,
  getMessagePreview,
  renderMessageContent,
} from "../lib/chat-utils"

interface ChatMessagesProps {
  isLoading: boolean
  messages: ChatMessage[]
  currentUserId: number
  otherMemberLastReadId: number | null
  scrollRef: React.RefObject<HTMLDivElement | null>
  messageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  scrollToMessage: (messageId: number) => void
  setReplyDraft: (message: ChatMessage | null) => void
  setSelectedMessage: (message: ChatMessage | null) => void
  setPinConfirmOpen: (open: boolean) => void
  setUnpinConfirmOpen: (open: boolean) => void
  setRecallConfirmOpen: (open: boolean) => void
  setDeleteConfirmOpen: (open: boolean) => void
  pins: ConversationPin[]
  highlightedMessageId: number | null
  scrollHintMode: "hidden" | "scroll" | "unread"
  handleScrollToBottom: () => void
  isFetchingNextPage: boolean
  activeConversation?: ConversationListItem | null
  onViewProfile?: (user: {
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  }) => void
  onTaskClick?: (taskId: number) => void
  tasks?: any[]
}

export function ChatMessages({
  isLoading,
  messages,
  currentUserId,
  otherMemberLastReadId,
  scrollRef,
  messageRefs,
  scrollToMessage,
  setReplyDraft,
  setSelectedMessage,
  setPinConfirmOpen,
  setUnpinConfirmOpen,
  setRecallConfirmOpen,
  setDeleteConfirmOpen,
  pins,
  highlightedMessageId,
  scrollHintMode,
  handleScrollToBottom,
  isFetchingNextPage,
  activeConversation,
  onTaskClick,
  tasks,
}: ChatMessagesProps) {
  const { t } = useTranslation()
  const [selectedUserProfile, setSelectedUserProfile] = React.useState<{
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  } | null>(null)

  const toggleReactionMutation = useToggleMessageReaction()

  const handleToggleReaction = React.useCallback(
    (messageId: number, emoji: string, conversationId: number) => {
      toggleReactionMutation.mutate({
        conversationId,
        messageId,
        emoji,
      })
    },
    [toggleReactionMutation]
  )

  return (
    <>
      <ScrollArea className="relative min-h-0 flex-1 px-4" ref={scrollRef}>
        <style>{`
        @keyframes context-menu-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-context-menu {
          animation: context-menu-in 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scale-spring {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-spring {
          animation: scale-spring 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
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
          {messages.map((msg, index) => {
            if (msg.type === "system") {
              return (
                <SystemMessageItem
                  key={msg.id}
                  ref={(node) => {
                    messageRefs.current[msg.id] = node
                  }}
                  msg={msg}
                  t={t}
                  activeConversation={activeConversation}
                  currentUserId={currentUserId}
                />
              )
            }

            const isMine = Number(msg.senderId) === Number(currentUserId)
            const isRead =
              isMine &&
              otherMemberLastReadId !== null &&
              msg.id <= otherMemberLastReadId
            const isPinned = pins.some((p) => p.messageId === msg.id)

            const prevMsg = messages[index - 1]
            const nextMsg = messages[index + 1]

            const isSameSender = (
              m1: typeof msg | undefined,
              m2: typeof msg | undefined
            ) => {
              if (!m1 || !m2) return false
              if (m1.type === "system" || m2.type === "system") return false
              return m1.senderId === m2.senderId
            }

            const isRecent = (
              m1: typeof msg | undefined,
              m2: typeof msg | undefined
            ) => {
              if (!m1 || !m2) return false
              const t1 = new Date(m1.createdAt).getTime()
              const t2 = new Date(m2.createdAt).getTime()
              return Math.abs(t1 - t2) < 5 * 60 * 1000
            }

            const isGroupedWithPrev =
              isSameSender(msg, prevMsg) && isRecent(msg, prevMsg)
            const isGroupedWithNext =
              isSameSender(msg, nextMsg) && isRecent(msg, nextMsg)

            const isGroup = activeConversation?.conversation?.type === "group"
            const showName = !isMine && isGroup && !isGroupedWithPrev
            const showAvatar = !isMine && isGroup && !isGroupedWithNext
            const hasAvatarSpace = !isMine && isGroup

            return (
              <ChatMessageItem
                key={msg.id}
                ref={(node) => {
                  messageRefs.current[msg.id] = node
                }}
                msg={msg}
                scrollRef={scrollRef}
                currentUserId={currentUserId}
                isMine={isMine}
                isRead={isRead}
                isPinned={isPinned}
                highlightedMessageId={highlightedMessageId}
                t={t}
                handleToggleReaction={handleToggleReaction}
                scrollToMessage={scrollToMessage}
                setReplyDraft={setReplyDraft}
                setSelectedMessage={setSelectedMessage}
                setPinConfirmOpen={setPinConfirmOpen}
                setUnpinConfirmOpen={setUnpinConfirmOpen}
                setRecallConfirmOpen={setRecallConfirmOpen}
                setDeleteConfirmOpen={setDeleteConfirmOpen}
                activeConversation={activeConversation}
                showName={showName}
                showAvatar={showAvatar}
                hasAvatarSpace={hasAvatarSpace}
                isGroupedWithPrev={isGroupedWithPrev}
                onViewProfile={setSelectedUserProfile}
                onTaskClick={onTaskClick}
                tasks={tasks}
              />
            )
          })}
        </div>
        {scrollHintMode !== "hidden" && (
          <button
            type="button"
            onClick={handleScrollToBottom}
            className={cn(
              "absolute right-4 bottom-4 z-10 flex h-9 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-all duration-300 hover:bg-muted active:scale-95",
              scrollHintMode === "unread"
                ? "gap-1.5 px-4 text-xs font-medium text-primary"
                : "w-9 text-muted-foreground hover:text-foreground"
            )}
          >
            {scrollHintMode === "unread" ? (
              <>
                <span>{t("chat.newMessagesBelow")}</span>
                <ArrowDown className="size-4 animate-bounce" />
              </>
            ) : (
              <ArrowDown className="size-4" />
            )}
          </button>
        )}
      </ScrollArea>
      <UserProfileDialog
        key={selectedUserProfile?.userId ?? "none"}
        user={selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
      />
    </>
  )
}

interface ChatMessageItemProps {
  msg: ChatMessage
  scrollRef: React.RefObject<HTMLDivElement | null>
  currentUserId: number
  isMine: boolean
  isRead: boolean
  isPinned: boolean
  highlightedMessageId: number | null
  t: (
    key: string,
    options?: { count?: number } & Record<string, unknown>
  ) => string
  handleToggleReaction: (
    messageId: number,
    emoji: string,
    conversationId: number
  ) => void
  scrollToMessage: (messageId: number) => void
  setReplyDraft: (message: ChatMessage | null) => void
  setSelectedMessage: (message: ChatMessage | null) => void
  setPinConfirmOpen: (open: boolean) => void
  setUnpinConfirmOpen: (open: boolean) => void
  setRecallConfirmOpen: (open: boolean) => void
  setDeleteConfirmOpen: (open: boolean) => void
  activeConversation?: ConversationListItem | null
  showName?: boolean
  showAvatar?: boolean
  hasAvatarSpace?: boolean
  isGroupedWithPrev?: boolean
  onViewProfile?: (user: {
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  }) => void
  onTaskClick?: (taskId: number) => void
  tasks?: any[]
}

interface SystemMessageItemProps {
  msg: ChatMessage
  t: (key: string, options?: Record<string, unknown>) => string
  activeConversation?: ConversationListItem | null
  currentUserId: number
}

const SystemMessageItem = React.forwardRef<
  HTMLDivElement,
  SystemMessageItemProps
>(({ msg, t, activeConversation, currentUserId }, ref) => {
  const text = React.useMemo(() => {
    if (!msg.content) return ""
    try {
      const payload = JSON.parse(msg.content)
      const eventType = payload.eventType

      const getActorName = (actorId: number, defaultName?: string) => {
        if (Number(actorId) === Number(currentUserId)) {
          return t("chat.tooltipYou")
        }
        if (activeConversation?.members) {
          const member = activeConversation.members.find(
            (m) => m.userId === actorId
          )
          if (member) return member.displayName
        }
        return defaultName || `User #${actorId}`
      }

      if (eventType === "group_created") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        return (
          t("chat.systemGroupCreated", {
            actor: actorName,
            groupName: payload.groupName,
          }) || `${actorName} đã tạo nhóm "${payload.groupName}"`
        )
      }

      if (eventType === "group_renamed") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        return (
          t("chat.systemGroupRenamed", {
            actor: actorName,
            newName: payload.newName,
          }) || `${actorName} đã đổi tên nhóm thành "${payload.newName}"`
        )
      }

      if (eventType === "member_joined") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        const targetName = getActorName(payload.targetId, payload.targetName)
        if (Number(payload.actorId) === Number(payload.targetId)) {
          return (
            t("chat.systemMemberJoinedSelf", {
              actor: actorName,
            }) || `${actorName} đã tham gia nhóm`
          )
        } else {
          return (
            t("chat.systemMemberJoined", {
              actor: actorName,
              target: targetName,
            }) || `${actorName} đã thêm ${targetName} vào nhóm`
          )
        }
      }

      if (eventType === "member_kicked") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        const targetName = getActorName(payload.targetId, payload.targetName)
        return (
          t("chat.systemMemberKicked", {
            actor: actorName,
            target: targetName,
          }) || `${actorName} đã xóa ${targetName} khỏi nhóm`
        )
      }

      if (eventType === "member_left") {
        const actorName = getActorName(payload.actorId, payload.displayName)
        return (
          t("chat.systemMemberLeft", {
            actor: actorName,
          }) || `${actorName} đã rời khỏi nhóm`
        )
      }
    } catch (e) {
      console.error("Failed to parse system message content:", e)
    }
    return msg.content
  }, [msg.content, activeConversation, currentUserId, t])

  return (
    <div ref={ref} className="flex w-full justify-center py-2 select-none">
      <span className="rounded-full bg-muted/65 px-4 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-xs">
        {text}
      </span>
    </div>
  )
})
SystemMessageItem.displayName = "SystemMessageItem"

const ChatMessageItem = React.forwardRef<HTMLDivElement, ChatMessageItemProps>(
  (
    {
      msg,
      scrollRef,
      currentUserId,
      isMine,
      isRead,
      isPinned,
      highlightedMessageId,
      t,
      handleToggleReaction,
      scrollToMessage,
      setReplyDraft,
      setSelectedMessage,
      setPinConfirmOpen,
      setUnpinConfirmOpen,
      setRecallConfirmOpen,
      setDeleteConfirmOpen,
      activeConversation,
      showName = false,
      showAvatar = false,
      hasAvatarSpace = false,
      isGroupedWithPrev = false,
      onViewProfile,
      onTaskClick,
      tasks,
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false)
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const [contextMenu, setContextMenu] = React.useState<{
      x: number
      y: number
    } | null>(null)
    const [scrollEl, setScrollEl] = React.useState<HTMLDivElement | null>(null)

    const isGroup = activeConversation?.conversation?.type === "group"
    const senderMember = React.useMemo(() => {
      if (!isGroup || !activeConversation?.members) return null
      return activeConversation.members.find((m) => m.userId === msg.senderId)
    }, [isGroup, activeConversation, msg.senderId])

    const senderDisplayName = React.useMemo(() => {
      return (
        senderMember?.displayName ??
        msg.sender?.displayName ??
        `User #${msg.senderId}`
      )
    }, [senderMember, msg.sender?.displayName, msg.senderId])

    const senderAvatar = React.useMemo(() => {
      return senderMember?.avatar ?? msg.sender?.avatar ?? null
    }, [senderMember, msg.sender?.avatar])

    const currentDisplayName = React.useMemo(() => {
      if (!activeConversation?.members) return undefined
      return activeConversation.members.find((m) => m.userId === currentUserId)
        ?.displayName
    }, [activeConversation, currentUserId])

    React.useEffect(() => {
      setScrollEl(scrollRef.current)
    }, [scrollRef])

    const showQuickBar =
      isHovered && !msg.isDeleted && !pickerOpen && !contextMenu

    const touchTimerRef = React.useRef<number | null>(null)
    const isLongPressRef = React.useRef(false)

    const handleTouchStart = (e: React.TouchEvent) => {
      isLongPressRef.current = false
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current)

      const touch = e.touches[0]
      const clientX = touch.clientX
      const clientY = touch.clientY

      touchTimerRef.current = window.setTimeout(() => {
        isLongPressRef.current = true
        setSelectedMessage(msg)
        setContextMenu({ x: clientX, y: clientY })
      }, 500)
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
      if (isLongPressRef.current) {
        e.preventDefault()
      }
    }

    const handleTouchMove = () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    }

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      setSelectedMessage(msg)
      setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleCopy = () => {
      if (msg.content) {
        navigator.clipboard.writeText(msg.content)
        toast.success(t("chat.copySuccess"))
      }
    }

    const handleForward = () => {
      toast.info(t("chat.forwardComingSoon"))
    }

    const groupedReactions = React.useMemo(() => {
      if (!msg.reactions || msg.reactions.length === 0) return []
      const groups: Record<string, { userIds: number[]; userNames: string[] }> =
        {}
      for (const r of msg.reactions) {
        if (!groups[r.emoji]) {
          groups[r.emoji] = { userIds: [], userNames: [] }
        }
        groups[r.emoji].userIds.push(r.userId)
        groups[r.emoji].userNames.push(r.user?.displayName || "Unknown")
      }
      return Object.entries(groups).map(([emoji, data]) => ({
        emoji,
        count: data.userIds.length,
        userIds: data.userIds,
        userNames: data.userNames,
        hasReacted: data.userIds.includes(currentUserId),
      }))
    }, [msg.reactions, currentUserId])

    React.useEffect(() => {
      return () => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
      }
    }, [])

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full scroll-mt-24 items-end gap-2 rounded-3xl",
          isMine ? "justify-end" : "justify-start",
          isGroupedWithPrev ? "mt-0.5" : "mt-3.5"
        )}
      >
        {hasAvatarSpace &&
          (showAvatar ? (
            <Avatar className="mb-1 h-8 w-8 shrink-0 rounded-full">
              <AvatarImage
                src={senderAvatar ?? undefined}
                alt={senderDisplayName}
              />
              <AvatarFallback className="rounded-full bg-primary/10 text-xs text-primary">
                {senderDisplayName.slice(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 shrink-0" />
          ))}

        {contextMenu && (
          <CustomContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            msg={msg}
            currentUserId={currentUserId}
            isMine={isMine}
            isPinned={isPinned}
            onClose={() => setContextMenu(null)}
            onToggleReaction={(emoji) =>
              handleToggleReaction(msg.id, emoji, msg.conversationId)
            }
            onOpenEmojiPicker={() => {
              setPickerOpen(true)
              setContextMenu(null)
            }}
            onReply={() => setReplyDraft(msg)}
            onCopy={handleCopy}
            onForward={handleForward}
            onPin={() => setPinConfirmOpen(true)}
            onUnpin={() => setUnpinConfirmOpen(true)}
            onRecall={() => setRecallConfirmOpen(true)}
            onDelete={() => setDeleteConfirmOpen(true)}
          />
        )}

        <Popover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open)
            if (!open) {
              setIsHovered(false)
            }
          }}
        >
          <HoverCard
            open={showQuickBar}
            onOpenChange={setIsHovered}
            openDelay={300}
          >
            <PopoverAnchor asChild>
              <HoverCardTrigger asChild>
                <div
                  className={cn(
                    "group relative flex max-w-[70%] flex-col gap-1 rounded-2xl",
                    isMine ? "items-end" : "items-start"
                  )}
                  onContextMenu={handleContextMenu}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  {showName && (
                    <button
                      type="button"
                      onClick={() =>
                        onViewProfile?.({
                          userId: msg.senderId,
                          displayName: senderDisplayName,
                          avatar: senderAvatar,
                          role: senderMember?.role,
                          joinedAt: senderMember?.joinedAt,
                        })
                      }
                      className="mb-0.5 ml-1 cursor-pointer text-left text-[11px] font-semibold text-primary/80 outline-none select-none hover:underline"
                    >
                      {senderDisplayName}
                    </button>
                  )}
                  {msg.isDeleted ? (
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-2 text-sm italic transition-shadow select-none",
                        isMine
                          ? "border-primary/15 bg-primary/5 text-primary/70"
                          : "border-border/40 bg-muted/40 text-muted-foreground/75"
                      )}
                    >
                      {t("chat.recalledMessage")}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm transition-shadow",
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
                        {renderMessageContent(
                          msg.content,
                          isMine,
                          activeConversation?.members,
                          currentDisplayName,
                          tasks,
                          onTaskClick
                        )}
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
                        {isPinned && (
                          <PinIcon className="size-3 shrink-0 rotate-45 fill-current" />
                        )}
                        {isMine &&
                          (isRead ? (
                            <CheckCheckIcon className="size-3.5" />
                          ) : (
                            <CheckIcon className="size-3.5" />
                          ))}
                      </div>

                      {groupedReactions.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <TooltipProvider>
                            {groupedReactions.map((group) => {
                              const displayedNames = group.userNames.map(
                                (name, i) =>
                                  group.userIds[i] === currentUserId
                                    ? t("chat.tooltipYou")
                                    : name
                              )
                              const tooltipText =
                                displayedNames.length <= 3
                                  ? `${displayedNames.join(", ")} ${t("chat.tooltipReacted")}`
                                  : `${displayedNames.slice(0, 3).join(", ")} ${t(
                                      "chat.tooltipAndOthers",
                                      {
                                        count: displayedNames.length - 3,
                                      }
                                    )} ${t("chat.tooltipReacted")}`

                              return (
                                <Tooltip key={group.emoji}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleReaction(
                                          msg.id,
                                          group.emoji,
                                          msg.conversationId
                                        )
                                      }}
                                      className={cn(
                                        "animate-scale-spring inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                                        isMine
                                          ? group.hasReacted
                                            ? "border border-primary-foreground/45 bg-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/35"
                                            : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/15"
                                          : group.hasReacted
                                            ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/15"
                                      )}
                                    >
                                      <span>{group.emoji}</span>
                                      <span className="text-[10px] font-semibold">
                                        {group.count}
                                      </span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs"
                                  >
                                    {tooltipText}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </HoverCardTrigger>
            </PopoverAnchor>
            <HoverCardContent
              side="top"
              align={isMine ? "end" : "start"}
              sideOffset={6}
              collisionPadding={8}
              collisionBoundary={scrollEl ?? undefined}
              className="w-auto border-none bg-transparent p-0 shadow-none ring-0 focus:outline-none"
            >
              <QuickReactBar
                msg={msg}
                currentUserId={currentUserId}
                onToggleReaction={(emoji) => {
                  handleToggleReaction(msg.id, emoji, msg.conversationId)
                  setIsHovered(false)
                }}
                onOpenEmojiPicker={() => {
                  setPickerOpen(true)
                  setIsHovered(false)
                }}
              />
            </HoverCardContent>
          </HoverCard>

          <PopoverContent
            side="top"
            align={isMine ? "end" : "start"}
            sideOffset={8}
            collisionPadding={16}
            className="w-auto border-none bg-transparent p-0 shadow-none ring-0 focus:outline-none"
          >
            <EmojiPicker
              onSelect={(emoji) =>
                handleToggleReaction(msg.id, emoji, msg.conversationId)
              }
              onClose={() => setPickerOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

ChatMessageItem.displayName = "ChatMessageItem"

interface QuickReactBarProps {
  msg: ChatMessage
  currentUserId: number
  onToggleReaction: (emoji: string) => void
  onOpenEmojiPicker: (e: React.MouseEvent) => void
}

function QuickReactBar({
  msg,
  currentUserId,
  onToggleReaction,
  onOpenEmojiPicker,
}: QuickReactBarProps) {
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"]

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border/40 bg-background/85 px-1.5 py-0.5 shadow-lg backdrop-blur-md dark:bg-muted/85">
      {emojis.map((emoji) => {
        const hasReacted = msg.reactions?.some(
          (r) => r.userId === currentUserId && r.emoji === emoji
        )
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleReaction(emoji)
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-[22px] transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.4] active:scale-90",
              hasReacted && "scale-110 border border-primary/20 bg-primary/10"
            )}
            style={{
              transitionTimingFunction:
                "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            {emoji}
          </button>
        )
      })}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpenEmojiPicker(e)
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-transform hover:bg-muted hover:text-foreground active:scale-95"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/50 bg-background shadow-2xl ring-1 ring-black/5">
      <Picker
        data={data}
        skinTonePosition="preview"
        previewPosition="none"
        perLine={9}
        maxFrequentRows={1}
        onEmojiSelect={(emoji: { native?: string }) => {
          if (typeof emoji?.native === "string") {
            onSelect(emoji.native)
            onClose()
          }
        }}
      />
    </div>
  )
}

interface CustomContextMenuProps {
  x: number
  y: number
  msg: ChatMessage
  currentUserId: number
  isMine: boolean
  isPinned: boolean
  onClose: () => void
  onToggleReaction: (emoji: string) => void
  onOpenEmojiPicker: (e: React.MouseEvent) => void
  onReply: () => void
  onCopy: () => void
  onForward: () => void
  onPin: () => void
  onUnpin: () => void
  onRecall: () => void
  onDelete: () => void
}

function CustomContextMenu({
  x,
  y,
  msg,
  currentUserId,
  isMine,
  isPinned,
  onClose,
  onToggleReaction,
  onOpenEmojiPicker,
  onReply,
  onCopy,
  onForward,
  onPin,
  onUnpin,
  onRecall,
  onDelete,
}: CustomContextMenuProps) {
  const { t } = useTranslation()
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    left: x,
    top: y,
    opacity: 0,
  })

  React.useLayoutEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const width = rect.width || 224
    const height = rect.height || 300

    let finalX = x
    let finalY = y

    if (finalX + width > window.innerWidth) {
      finalX = window.innerWidth - width - 8
    }
    if (finalX < 8) finalX = 8

    if (finalY + height > window.innerHeight) {
      finalY = window.innerHeight - height - 8
    }
    if (finalY < 8) finalY = 8

    setStyle({
      position: "fixed",
      left: finalX,
      top: finalY,
      opacity: 1,
    })
  }, [x, y])

  React.useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return
      }
      onClose()
    }

    const handleScroll = () => {
      onClose()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    window.addEventListener("mousedown", handleClose)
    window.addEventListener("scroll", handleScroll, { capture: true })
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("mousedown", handleClose)
      window.removeEventListener("scroll", handleScroll, { capture: true })
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"]

  return (
    <div
      ref={menuRef}
      style={style}
      className="animate-context-menu z-50 w-56 rounded-xl border border-border/40 bg-popover/80 p-1 text-popover-foreground shadow-xl backdrop-blur-md transition-opacity duration-150 dark:bg-muted/80"
    >
      {!msg.isDeleted && (
        <div className="mb-1 flex items-center justify-around gap-0.5 border-b border-border/40 px-1 py-1.5">
          {emojis.map((emoji) => {
            const hasReacted = msg.reactions?.some(
              (r) => r.userId === currentUserId && r.emoji === emoji
            )
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(emoji)
                  onClose()
                }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-base transition-all duration-200 ease-out hover:scale-125 active:scale-95",
                  hasReacted &&
                    "scale-110 border border-primary/20 bg-primary/10"
                )}
                style={{
                  transitionTimingFunction:
                    "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                }}
              >
                {emoji}
              </button>
            )
          })}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenEmojiPicker(e)
            }}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {msg.isDeleted ? (
          <button
            type="button"
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2Icon className="size-4" />
            {t("chat.deleteAction")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onReply()
                onClose()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <ReplyIcon className="size-4" />
              {t("chat.replyAction")}
            </button>

            <button
              type="button"
              onClick={() => {
                onCopy()
                onClose()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <Copy className="size-4" />
              {t("chat.copyAction", "Copy")}
            </button>

            <button
              type="button"
              onClick={() => {
                onForward()
                onClose()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <ArrowRight className="size-4" />
              {t("chat.forwardAction", "Forward")}
            </button>

            {isPinned ? (
              <button
                type="button"
                onClick={() => {
                  onUnpin()
                  onClose()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <PinOffIcon className="size-4" />
                {t("chat.unpinAction")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onPin()
                  onClose()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <PinIcon className="size-4" />
                {t("chat.pinAction")}
              </button>
            )}

            {isMine && (
              <button
                type="button"
                onClick={() => {
                  onRecall()
                  onClose()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <Undo2Icon className="size-4" />
                {t("chat.recallAction")}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onDelete()
                onClose()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2Icon className="size-4" />
              {t("chat.deleteAction")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
