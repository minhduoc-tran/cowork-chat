import * as React from "react"
import { CalendarIcon, MailIcon, MessageSquareIcon, ShieldCheckIcon, UserPlusIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useFriends } from "@/shared/api/features/friend/hooks"
import { useSendFriendRequest } from "@/shared/api/features/user/hooks"
import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"

interface UserProfileDialogProps {
  user: {
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  } | null
  onClose: () => void
}

export function UserProfileDialog({ user, onClose }: UserProfileDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [requestSent, setRequestSent] = React.useState(false)

  const { data: friendsData } = useFriends()
  const sendRequest = useSendFriendRequest()
  if (!user) return null

  // Check if this user is a friend
  const friendItem = friendsData?.friends.find(
    (f) => f.friend.id === user.userId
  )
  const isFriend = !!friendItem
  const friendEmail = friendItem?.friend.email

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  const handleSendRequest = async () => {
    try {
      await sendRequest.mutateAsync(user.userId)
      setRequestSent(true)
      toast.success(t("addFriend.requestSent"))
    } catch (err) {
      console.error("Failed to send friend request:", err)
      toast.error(t("addFriend.error") || "Gửi yêu cầu kết bạn thất bại")
    }
  }

  const handleStartChat = () => {
    onClose()
    navigate(`/chat/${user.userId}`)
  }

  const getRoleLabel = (role?: string) => {
    if (role === "owner") return "Trưởng nhóm (Owner)"
    if (role === "admin") return "Quản trị viên (Admin)"
    return "Thành viên (Member)"
  };

  const formattedJoinedDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-xs gap-0 overflow-hidden p-0 rounded-xl">
        {/* Header containing Close button */}
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/90 hover:bg-black/60 transition-all outline-none"
            aria-label={t("profile.close")}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Cover gradient */}
        <div className="relative h-24 w-full bg-linear-to-br from-primary/30 to-primary/10" />

        {/* Avatar + Display Name */}
        <div className="relative px-5 pb-3">
          <div className="-mt-8 flex flex-col items-center">
            <Avatar className="h-20 w-20 rounded-full border-4 border-background shadow-md">
              <AvatarImage
                src={user.avatar ?? undefined}
                alt={user.displayName}
              />
              <AvatarFallback className="rounded-full text-2xl font-bold bg-muted text-muted-foreground">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-2 text-base font-bold text-foreground text-center">
              {user.displayName}
            </h3>
            {user.role && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldCheckIcon className="size-3" />
                {getRoleLabel(user.role)}
              </span>
            )}
          </div>
        </div>

        {/* User details */}
        <div className="space-y-3.5 border-t px-5 py-4 text-xs">
          {/* Email Info */}
          <div className="flex items-center gap-3">
            <MailIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="truncate text-foreground font-medium">
                {isFriend && friendEmail ? friendEmail : "Chỉ chia sẻ với bạn bè"}
              </p>
            </div>
          </div>

          {/* Group joined info */}
          {formattedJoinedDate && (
            <div className="flex items-center gap-3">
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tham gia nhóm</p>
                <p className="text-foreground font-medium">{formattedJoinedDate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action footer */}
        <AlertDialogFooter className="border-t bg-muted/10 p-3.5 gap-2 sm:flex-row sm:justify-center">
          {isFriend ? (
            <Button
              onClick={handleStartChat}
              className="w-full gap-2 text-xs"
              size="sm"
            >
              <MessageSquareIcon className="size-3.5" />
              Nhắn tin
            </Button>
          ) : requestSent ? (
            <Button
              disabled
              variant="outline"
              className="w-full gap-2 text-xs text-emerald-600 border-emerald-200 bg-emerald-50/50"
              size="sm"
            >
              <UserPlusIcon className="size-3.5" />
              Đã gửi lời mời
            </Button>
          ) : (
            <Button
              onClick={handleSendRequest}
              disabled={sendRequest.isPending}
              className="w-full gap-2 text-xs"
              size="sm"
            >
              <UserPlusIcon className="size-3.5" />
              {sendRequest.isPending ? "Đang gửi..." : "Kết bạn"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
