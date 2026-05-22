import * as React from "react"
import {
  ArrowDown,
  CheckCheckIcon,
  CheckIcon,
  PinIcon,
  PinOffIcon,
  ReplyIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ConversationPin } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu"
import { ScrollArea } from "@/shared/ui/scroll-area"

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
  pins: ConversationPin[]
  highlightedMessageId: number | null
  scrollHintMode: "hidden" | "scroll" | "unread"
  handleScrollToBottom: () => void
  isFetchingNextPage: boolean
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
  pins,
  highlightedMessageId,
  scrollHintMode,
  handleScrollToBottom,
  isFetchingNextPage,
}: ChatMessagesProps) {
  const { t } = useTranslation()

  return (
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
                  {pins.some((p) => p.messageId === msg.id) ? (
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
  )
}
