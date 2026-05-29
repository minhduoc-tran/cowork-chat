import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { Notification } from "@/shared/api"
import { useMarkNotificationRead } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

/**
 * Replace embedded task mention markup `[[task:id|title]]` with just the
 * readable title so previews don't show raw syntax.
 */
function formatPreview(text: string): string {
  return text.replace(/\[\[task:\d+\|([\s\S]*?)\]\]/g, "$1").trim()
}

function formatRelativeTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return t("notifications.justNow", "Vừa xong")
  if (diffMin < 60) return t("notifications.minutesAgo", { count: diffMin })
  if (diffHours < 24) return t("notifications.hoursAgo", { count: diffHours })
  if (diffDays < 7) return t("notifications.daysAgo", { count: diffDays })
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
  })
}

function buildMessage(
  notification: Notification,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const actorName =
    notification.actor?.displayName ?? t("notifications.someone")
  const data = notification.data

  switch (notification.type) {
    case "task_assigned":
      return t("notifications.taskAssigned", {
        name: actorName,
        title: data?.taskTitle ?? "",
      })
    case "task_mention":
      return t("notifications.taskMention", {
        name: actorName,
        title: data?.taskTitle ?? "",
      })
    case "message_mention":
      return t("notifications.messageMention", {
        name: actorName,
        conversation:
          data?.conversationName ?? t("notifications.aConversation"),
      })
    default:
      return t("notifications.newNotification", "Bạn có thông báo mới")
  }
}

/**
 * Build the navigation target for a notification.
 * - Task notifications open the group chat with the task sheet (?task=).
 * - Message mentions open the group chat directly.
 */
function buildNavTarget(notification: Notification): string | null {
  const data = notification.data
  if (!data) return null

  switch (notification.type) {
    case "task_assigned":
    case "task_mention":
      if (data.conversationId) {
        const params = data.taskId ? `?task=${data.taskId}` : ""
        return `/chat/group/${data.conversationId}${params}`
      }
      return null
    case "message_mention":
      if (data.conversationId) {
        return `/chat/group/${data.conversationId}`
      }
      return null
    default:
      return null
  }
}

export function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()

  const message = buildMessage(notification, t)
  const actorName =
    notification.actor?.displayName ?? t("notifications.someone")

  const handleClick = () => {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }

    const target = buildNavTarget(notification)
    if (target) {
      navigate(target)
      onNavigate?.()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        !notification.isRead && "bg-primary/5"
      )}
    >
      <Avatar className="mt-0.5 h-9 w-9 shrink-0 rounded-full">
        <AvatarImage
          src={notification.actor?.avatar ?? undefined}
          alt={actorName}
        />
        <AvatarFallback className="rounded-full text-xs">
          {actorName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm leading-snug">{message}</p>
        {notification.data?.preview && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {formatPreview(notification.data.preview)}
          </p>
        )}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt, t)}
        </span>
      </div>
      {!notification.isRead && (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}
    </button>
  )
}
