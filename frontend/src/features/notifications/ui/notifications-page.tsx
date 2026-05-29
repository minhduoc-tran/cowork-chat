import { CheckCheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useMarkAllNotificationsRead, useNotifications } from "@/shared/api"
import { Button } from "@/shared/ui/button"
import { NotificationItem } from "@/shared/ui/notification-item"
import { Skeleton } from "@/shared/ui/skeleton"

function NotificationsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{t("notifications.title")}</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheckIcon className="size-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
            {t("notifications.empty")}
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
