import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import {
  useAcceptFriendRequest,
  usePendingRequests,
  useRejectFriendRequest,
  useSentRequests,
} from "@/shared/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"

function RequestsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReceivedRequestsContent() {
  const { t } = useTranslation()
  const { data, isLoading } = usePendingRequests()
  const acceptRequest = useAcceptFriendRequest()
  const rejectRequest = useRejectFriendRequest()

  if (isLoading) return <RequestsSkeleton />

  const requests = data?.requests ?? []

  if (requests.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        {t("requests.noReceived")}
      </div>
    )
  }

  return (
    <div className="space-y-2 p-6">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-4 rounded-lg border p-4"
        >
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage
              src={req.sender?.avatar ?? undefined}
              alt={req.sender?.displayName}
            />
            <AvatarFallback className="rounded-full">
              {req.sender?.displayName?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{req.sender?.displayName}</div>
            <div className="text-sm text-muted-foreground">
              {req.sender?.email}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => acceptRequest.mutate(req.id)}
              disabled={acceptRequest.isPending}
            >
              {t("requests.accept")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectRequest.mutate(req.id)}
              disabled={rejectRequest.isPending}
            >
              {t("requests.reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SentRequestsContent() {
  const { t } = useTranslation()
  const { data, isLoading } = useSentRequests()

  if (isLoading) return <RequestsSkeleton />

  const requests = data?.requests ?? []

  if (requests.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        {t("requests.noSent")}
      </div>
    )
  }

  return (
    <div className="space-y-2 p-6">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-4 rounded-lg border p-4"
        >
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage
              src={req.receiver?.avatar ?? undefined}
              alt={req.receiver?.displayName}
            />
            <AvatarFallback className="rounded-full">
              {req.receiver?.displayName?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{req.receiver?.displayName}</div>
            <div className="text-sm text-muted-foreground">
              {req.receiver?.email}
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {t("requests.pending")}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RequestsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const subPath = location.pathname

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">
          {subPath === "/requests/sent"
            ? t("requests.sent")
            : t("requests.received")}
        </h1>
      </header>
      <div className="flex-1">
        {subPath === "/requests/sent" ? (
          <SentRequestsContent />
        ) : (
          <ReceivedRequestsContent />
        )}
      </div>
    </div>
  )
}

export default RequestsPage
