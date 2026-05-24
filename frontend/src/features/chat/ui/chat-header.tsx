import { MoreVertical, PanelRight, Phone, Search, Video } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

interface ChatHeaderProps {
  friend?: {
    id: number
    avatar?: string | null
    displayName?: string
    isOnline?: boolean
    isGroup?: boolean
    memberCount?: number
  } | null
  targetUserId: number | null
  isOtherUserTyping: boolean | string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatHeader({
  friend,
  targetUserId,
  isOtherUserTyping,
  sidebarOpen,
  onToggleSidebar,
}: ChatHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 select-none">
      <div className="flex items-center gap-3">
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
              ? typeof isOtherUserTyping === "string"
                ? t("chat.typing", { name: isOtherUserTyping })
                : t("chat.typing", { name: friend?.displayName })
              : friend?.isGroup
                ? t("chat.memberCount", { count: friend?.memberCount })
                : friend?.isOnline
                  ? t("chat.online")
                  : t("chat.offline")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground active:scale-95"
        >
          <Search className="size-4.5" />
        </button>
        {friend?.isGroup ? (
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Video className="size-4.5" />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Phone className="size-4.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-all outline-none hover:bg-muted active:scale-95",
            sidebarOpen
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PanelRight className="size-4.5" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground active:scale-95"
        >
          <MoreVertical className="size-4.5" />
        </button>
      </div>
    </header>
  )
}
