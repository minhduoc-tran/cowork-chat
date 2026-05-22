import * as React from "react"
import { ReplyIcon, SendIcon, SmileIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

import type { ChatMessage } from "../lib/chat-utils"
import { getMessagePreview } from "../lib/chat-utils"

interface ChatInputPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  handleSend: () => void
  isOtherUserTyping: boolean
  friend?: {
    displayName?: string
  }
  replyDraft: ChatMessage | null
  setReplyDraft: (message: ChatMessage | null) => void
  scrollToMessage: (messageId: number) => void
  getSenderName: (message: ChatMessage) => string
}

export function ChatInputPanel({
  input,
  handleInputChange,
  handleKeyDown,
  handleSend,
  isOtherUserTyping,
  friend,
  replyDraft,
  setReplyDraft,
  scrollToMessage,
  getSenderName,
}: ChatInputPanelProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("shrink-0", !isOtherUserTyping && "border-t")}>
      {isOtherUserTyping && (
        <div className="animate-in animate-pulse px-4 pt-2.5 pb-0.5 text-xs font-semibold text-primary duration-200 fade-in">
          {t("chat.typing", { name: friend?.displayName })}
        </div>
      )}
      {replyDraft && (
        <div
          className={cn(
            "flex items-start gap-3 border-b bg-muted/35 px-3 py-2",
            isOtherUserTyping && "border-t"
          )}
        >
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
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5",
          isOtherUserTyping && !replyDraft && "border-t"
        )}
      >
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
  )
}
