import * as React from "react"
import { LoaderIcon, SearchIcon, UserPlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  useFindUserByEmail,
  useSendFriendRequest,
} from "@/shared/api/features/user/hooks"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function AddFriendDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [email, setEmail] = React.useState("")
  const [requestSent, setRequestSent] = React.useState(false)
  const debouncedEmail = useDebounce(email.trim(), 500)

  const {
    data: result,
    isLoading,
    isError,
  } = useFindUserByEmail(debouncedEmail)

  const sendRequest = useSendFriendRequest()

  // Reset state when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEmail("")
      setRequestSent(false)
    }
    onOpenChange(nextOpen)
  }

  const handleSendRequest = async () => {
    if (!result?.user) return
    await sendRequest.mutateAsync(result.user.id)
    setRequestSent(true)
  }

  const showResult = debouncedEmail.includes("@") && !isLoading

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("addFriend.title")}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("addFriend.title")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setRequestSent(false)
            }}
            placeholder={t("addFriend.searchPlaceholder")}
            className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        {/* Loading */}
        {isLoading && debouncedEmail.includes("@") && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <LoaderIcon className="size-4 animate-spin" />
            {t("addFriend.searching")}
          </div>
        )}

        {/* Not found */}
        {showResult && isError && (
          <div className="py-3 text-center text-sm text-muted-foreground">
            {t("addFriend.notFound")}
          </div>
        )}

        {/* Found user */}
        {showResult && result?.user && (
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Avatar className="h-10 w-10 rounded-full">
              <AvatarImage
                src={result.user.avatar ?? undefined}
                alt={result.user.displayName}
              />
              <AvatarFallback className="rounded-full">
                {result.user.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {result.user.displayName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {result.user.email}
              </div>
            </div>
            {result.isFriend ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("addFriend.alreadyFriend")}
              </span>
            ) : requestSent ? (
              <span className="shrink-0 text-xs text-emerald-600">
                {t("addFriend.requestSent")}
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handleSendRequest}
                disabled={sendRequest.isPending}
                className="shrink-0 gap-1"
              >
                <UserPlusIcon className="size-3.5" />
                {sendRequest.isPending
                  ? t("addFriend.sending")
                  : t("addFriend.sendRequest")}
              </Button>
            )}
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
