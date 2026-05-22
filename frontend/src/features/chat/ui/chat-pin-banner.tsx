import * as React from "react"
import { PinIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { ConversationPin } from "@/shared/api"
import { cn } from "@/shared/lib/utils"

import type { ChatMessage } from "../lib/chat-utils"
import { formatTime, getMessagePreview } from "../lib/chat-utils"

interface ChatPinBannerProps {
  pins: ConversationPin[]
  currentPin: ConversationPin | null
  activePinIndex: number
  setActivePinIndex: React.Dispatch<React.SetStateAction<number>>
  scrollToMessage: (messageId: number) => void
  setUnpinConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>
  messages: ChatMessage[]
}

export function ChatPinBanner({
  pins,
  currentPin,
  activePinIndex,
  setActivePinIndex,
  scrollToMessage,
  setUnpinConfirmOpen,
  messages,
}: ChatPinBannerProps) {
  const { t } = useTranslation()

  if (pins.length === 0 || !currentPin) return null

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-1.5 text-xs">
      {/* Vertical rail: one segment per pin */}
      <div className="mr-3 flex flex-col items-center gap-0.5">
        {pins.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-0.5 rounded-full transition-all duration-200",
              i === activePinIndex
                ? "bg-primary h-3.5"
                : "bg-muted-foreground/30 h-1.5"
            )}
          />
        ))}
      </div>

      <div
        onClick={() => {
          const msgId = Number(currentPin.messageId)
          const msgExists = messages.some((m) => Number(m.id) === msgId)
          if (msgExists) {
            scrollToMessage(msgId)
          } else {
            toast.info(t("chat.pinNoticeTooOld"))
          }
          // Advance to next pin
          setActivePinIndex((prev) => (prev + 1) % pins.length)
        }}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
        title={`Pinned by ${currentPin.pinnedByName} at ${formatTime(currentPin.pinnedAt)}`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PinIcon className="size-4 rotate-45" />
        </div>
        <div className="min-w-0 flex-1 border-l-2 border-primary/55 pl-2.5">
          <div className="truncate font-semibold text-primary">
            {t("chat.pinnedLabel")} {activePinIndex + 1}/{pins.length}
          </div>
          <div className="truncate text-muted-foreground text-[11px] mt-0.5">
            <span className="font-medium text-foreground">
              {currentPin.messagePreview.senderName}:
            </span>{" "}
            {getMessagePreview(
              currentPin.messagePreview.content,
              t("chat.messageUnavailable"),
              70
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setUnpinConfirmOpen(true)}
        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Unpin message"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
