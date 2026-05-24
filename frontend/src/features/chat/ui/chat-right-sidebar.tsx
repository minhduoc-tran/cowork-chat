import * as React from "react"
import {
  Bell,
  File,
  Gift,
  Image as ImageIcon,
  Link as LinkIcon,
  LogOut,
  Mail,
  MessageSquare,
  Sliders,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { ConversationListItem } from "@/shared/api"
import { useFriends } from "@/shared/api/features/friend/hooks"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

interface ChatRightSidebarProps {
  friend?: {
    id: number
    displayName: string
    avatar: string | null
    isOnline?: boolean
    isGroup?: boolean
    memberCount?: number
    email?: string
  } | null
  activeConversation?: ConversationListItem | null
  currentUserId: number
  onClose: () => void
  onViewProfile: (user: {
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  }) => void
  onLeaveGroup?: () => void
  onEditGroup?: () => void
  onDisbandGroup?: () => void
}

export function ChatRightSidebar({
  friend,
  activeConversation,
  currentUserId,
  onClose,
  onViewProfile,
  onLeaveGroup,
  onEditGroup,
  onDisbandGroup,
}: ChatRightSidebarProps) {
  const { t } = useTranslation()
  const { data: friendsData } = useFriends()

  if (!friend) return null

  const isGroup = !!friend.isGroup

  // Find if this friend is in our friends list to get extra info if needed
  const friendItem = friendsData?.friends.find((f) => f.friend.id === friend.id)
  const isFriend = !!friendItem
  const displayEmail = friend.email || friendItem?.friend.email

  const initials = friend.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  const handleMuteToggle = () => {
    toast.info("Tính năng tắt thông báo sẽ sớm ra mắt!")
  }

  const handleActionClick = (actionName: string) => {
    toast.info(`Tính năng ${actionName} sẽ sớm ra mắt!`)
  }

  // Import toast from sonner if needed, let's import it dynamically or add import
  // Wait, let's import it properly
  return (
    <div className="relative flex h-full w-80 shrink-0 flex-col border-l bg-background select-none">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all outline-none hover:bg-muted active:scale-95"
        aria-label={t("profile.close")}
      >
        <X className="size-5" />
      </button>

      {/* Main Scrollable Content */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {/* Profile Card Header */}
        <div className="mt-4 flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 rounded-full border border-border shadow-xs">
            <AvatarImage
              src={friend.avatar ?? undefined}
              alt={friend.displayName}
            />
            <AvatarFallback className="rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-3 max-w-full truncate px-2 text-lg font-bold text-foreground">
            {friend.displayName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isGroup
              ? t("chat.memberCount", { count: friend.memberCount })
              : friend.isOnline
                ? t("chat.online")
                : t("chat.offline")}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex justify-center gap-5 border-b pb-6">
          {isGroup ? (
            <>
              {/* Group Actions */}
              <button
                type="button"
                onClick={handleMuteToggle}
                className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
                  <Bell className="size-4.5" />
                </div>
                <span className="text-xs font-semibold">Mute</span>
              </button>
              {(activeConversation?.members?.find(
                (m) => m.userId === currentUserId
              )?.role === "owner" ||
                activeConversation?.members?.find(
                  (m) => m.userId === currentUserId
                )?.role === "admin") && (
                <button
                  type="button"
                  onClick={onEditGroup}
                  className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
                    <Sliders className="size-4.5" />
                  </div>
                  <span className="text-xs font-semibold">Manage</span>
                </button>
              )}
              {activeConversation?.members?.find(
                (m) => m.userId === currentUserId
              )?.role === "owner" && (
                <button
                  type="button"
                  onClick={onDisbandGroup}
                  className="flex cursor-pointer flex-col items-center gap-1.5 text-destructive transition-all outline-none hover:text-destructive/80 active:scale-95"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/15">
                    <Trash2 className="size-4.5" />
                  </div>
                  <span className="text-xs font-semibold">Disband</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLeaveGroup}
                className="flex cursor-pointer flex-col items-center gap-1.5 text-destructive transition-all outline-none hover:text-destructive/80 active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/15">
                  <LogOut className="size-4.5" />
                </div>
                <span className="text-xs font-semibold">Leave</span>
              </button>
            </>
          ) : (
            <>
              {/* 1:1 Actions */}
              <button
                type="button"
                onClick={onClose}
                className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
                  <MessageSquare className="size-4.5" />
                </div>
                <span className="text-xs font-semibold">Message</span>
              </button>
              <button
                type="button"
                onClick={handleMuteToggle}
                className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
                  <Bell className="size-4.5" />
                </div>
                <span className="text-xs font-semibold">Mute</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionClick("quà tặng")}
                className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
                  <Gift className="size-4.5" />
                </div>
                <span className="text-xs font-semibold">Gift</span>
              </button>
            </>
          )}
        </div>

        {/* Info & Shared Media Section */}
        <div className="space-y-5">
          {/* Email / Username for 1:1 */}
          {!isGroup && (
            <div className="space-y-4 border-b pb-5">
              <div className="flex items-center gap-3">
                <Mail className="size-5 shrink-0 text-muted-foreground/85" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {isFriend && displayEmail
                      ? displayEmail
                      : "Chỉ chia sẻ với bạn bè"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Email</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="size-5 shrink-0 text-muted-foreground/85" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayEmail
                      ? `@${displayEmail.split("@")[0]}`
                      : `@user_${friend.id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Username
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shared Media Items (Mocked for style parity) */}
          <div className="space-y-3.5 border-b pb-5">
            <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Shared Media
            </h4>
            <div className="space-y-3">
              <div className="flex cursor-pointer items-center gap-3 transition-colors hover:text-primary">
                <ImageIcon className="size-5 shrink-0 text-muted-foreground/85" />
                <span className="text-sm font-medium text-foreground">
                  {isGroup ? "27 tệp ảnh" : "558 tệp ảnh"}
                </span>
              </div>
              <div className="flex cursor-pointer items-center gap-3 transition-colors hover:text-primary">
                <File className="size-5 shrink-0 text-muted-foreground/85" />
                <span className="text-sm font-medium text-foreground">
                  {isGroup ? "3 tài liệu" : "12 tài liệu"}
                </span>
              </div>
              <div className="flex cursor-pointer items-center gap-3 transition-colors hover:text-primary">
                <LinkIcon className="size-5 shrink-0 text-muted-foreground/85" />
                <span className="text-sm font-medium text-foreground">
                  {isGroup ? "26 liên kết" : "134 liên kết"}
                </span>
              </div>
            </div>
          </div>

          {/* Group Members List */}
          {isGroup && activeConversation?.members && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  {t("chat.memberCount", {
                    count: activeConversation.members.length,
                  })}
                </h4>
                <button
                  type="button"
                  onClick={() => handleActionClick("thêm thành viên")}
                  className="cursor-pointer p-0.5 text-primary transition-colors hover:text-primary/80 active:scale-90"
                  aria-label="Add member"
                >
                  <UserPlus className="size-4.5" />
                </button>
              </div>

              <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
                {activeConversation.members.map((member) => {
                  const isMemberOnline =
                    member.userId === currentUserId ? true : false
                  const memberInitials = member.displayName
                    ?.split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()

                  return (
                    <div
                      key={member.userId}
                      onClick={() =>
                        onViewProfile({
                          userId: member.userId,
                          displayName: member.displayName,
                          avatar: member.avatar,
                          role: member.role,
                          joinedAt: member.joinedAt,
                        })
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/40"
                    >
                      <Avatar className="h-8.5 w-8.5 shrink-0 rounded-full">
                        <AvatarImage
                          src={member.avatar ?? undefined}
                          alt={member.displayName}
                        />
                        <AvatarFallback className="rounded-full bg-primary/10 text-xs text-primary">
                          {memberInitials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {member.displayName}
                          </p>
                          {member.role && member.role !== "member" && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold capitalize",
                                member.role === "owner"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                              )}
                            >
                              {member.role}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {member.userId === currentUserId
                            ? t("chat.online")
                            : isMemberOnline
                              ? t("chat.online")
                              : "offline"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
