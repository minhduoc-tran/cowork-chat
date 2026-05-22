import { useTranslation } from "react-i18next"

import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

interface ChatHeaderProps {
  friend?: {
    avatar?: string | null
    displayName?: string
    isOnline?: boolean
  }
  targetUserId: number | null
  isOtherUserTyping: boolean
}

export function ChatHeader({
  friend,
  targetUserId,
  isOtherUserTyping,
}: ChatHeaderProps) {
  const { t } = useTranslation()

  return (
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
        <div
          className={cn(
            "text-xs text-muted-foreground transition-all duration-200",
            isOtherUserTyping && "animate-pulse font-medium text-primary"
          )}
        >
          {isOtherUserTyping
            ? t("chat.typing", { name: friend?.displayName })
            : friend?.isOnline
              ? t("chat.online")
              : t("chat.offline")}
        </div>
      </div>
    </header>
  )
}
