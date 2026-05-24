"use client"

import * as React from "react"
import {
  ArchiveXIcon,
  FileIcon,
  MessageCircleIcon,
  SendIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

import { useAuthStore } from "@/features/auth"

import type { ConversationListItem } from "@/shared/api"
import { useConversations, useFriends } from "@/shared/api"
import { type NavUserProfile } from "@/shared/lib/nav-user.utils"
import { cn } from "@/shared/lib/utils"
import { AddFriendDialog } from "@/shared/ui/add-friend-dialog"
import { getConversationPreviewText } from "@/shared/ui/app-sidebar-preview"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { CreateGroupDialog } from "@/shared/ui/create-group-dialog"
import { NavUser } from "@/shared/ui/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar"
import { Skeleton } from "@/shared/ui/skeleton"

const navMain = [
  {
    titleKey: "nav.conversations",
    url: "/conversations",
    icon: <MessageCircleIcon />,
  },
  {
    titleKey: "nav.friends",
    url: "/friends",
    icon: <UsersIcon />,
  },
  {
    titleKey: "nav.drafts",
    url: "/drafts",
    icon: <FileIcon />,
  },
  {
    titleKey: "nav.sent",
    url: "/sent",
    icon: <SendIcon />,
  },
  {
    titleKey: "nav.junk",
    url: "/junk",
    icon: <ArchiveXIcon />,
  },
  {
    titleKey: "nav.trash",
    url: "/trash",
    icon: <Trash2Icon />,
  },
  {
    titleKey: "nav.requests",
    url: "/requests",
    icon: <UserPlusIcon />,
  },
]

function formatMessageDate(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  if (diffDays === 1) return t("sidebar.yesterday")
  if (diffDays < 7) return t("sidebar.daysAgo", { count: diffDays })
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
  })
}

function getConversationDisplayName(
  item: ConversationListItem,
  currentUserId: number | undefined
): string {
  if (item.conversation.type === "group") {
    return item.conversation.name || "Nhóm không tên"
  }
  // Direct: tìm member khác mình
  const otherMember = item.members.find((m) => m.userId !== currentUserId)
  return otherMember?.displayName || "Cuộc trò chuyện"
}

function getConversationAvatar(
  item: ConversationListItem,
  currentUserId: number | undefined
): string | null {
  if (item.conversation.type === "group") {
    return null
  }
  const otherMember = item.members.find((m) => m.userId !== currentUserId)
  return otherMember?.avatar || null
}

function getConversationOnlineStatus(
  item: ConversationListItem,
  currentUserId: number | undefined
): boolean {
  if (item.conversation.type !== "direct") {
    return false
  }

  const otherMember = item.members.find((m) => m.userId !== currentUserId)
  return otherMember?.isOnline ?? false
}

function getConversationInitials(
  item: ConversationListItem,
  currentUserId: number | undefined
): string {
  const name = getConversationDisplayName(item, currentUserId)
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getConversationLink(
  item: ConversationListItem,
  currentUserId: number | undefined
): string {
  if (item.conversation.type === "direct") {
    const otherMember = item.members.find((m) => m.userId !== currentUserId)
    return otherMember ? `/chat/${otherMember.userId}` : "/conversations"
  }
  return `/chat/group/${item.conversation.id}`
}

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

function ConversationsPanel({
  currentUserId,
}: {
  currentUserId: string | undefined
}) {
  const { data: conversationsData, isLoading } = useConversations()
  const { t } = useTranslation()

  if (isLoading) return <ConversationListSkeleton />

  if (!conversationsData || conversationsData.conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t("sidebar.noConversations")}
      </div>
    )
  }

  return (
    <>
      {conversationsData.conversations.map((item) => (
        <Link
          to={getConversationLink(
            item,
            currentUserId ? Number(currentUserId) : undefined
          )}
          key={item.conversation.id}
          className="flex items-start gap-3 border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <div className="relative mt-0.5 shrink-0">
            <Avatar>
              {getConversationAvatar(
                item,
                currentUserId ? Number(currentUserId) : undefined
              ) ? (
                <AvatarImage
                  src={
                    getConversationAvatar(
                      item,
                      currentUserId ? Number(currentUserId) : undefined
                    )!
                  }
                />
              ) : null}
              <AvatarFallback>
                {getConversationInitials(
                  item,
                  currentUserId ? Number(currentUserId) : undefined
                )}
              </AvatarFallback>
            </Avatar>
            {getConversationOnlineStatus(
              item,
              currentUserId ? Number(currentUserId) : undefined
            ) && (
              <span
                data-slot="conversation-online-indicator"
                className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-sidebar bg-emerald-500"
                aria-label="Online"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex w-full items-center gap-2">
              <span className="truncate font-medium">
                {getConversationDisplayName(
                  item,
                  currentUserId ? Number(currentUserId) : undefined
                )}
              </span>
              {item.lastMessage && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {formatMessageDate(item.lastMessage.createdAt, t)}
                </span>
              )}
            </div>
            <span className="line-clamp-1 min-w-0 text-xs text-muted-foreground">
              {getConversationPreviewText(
                item,
                currentUserId ? Number(currentUserId) : undefined,
                t
              )}
            </span>
          </div>
        </Link>
      ))}
    </>
  )
}

function FriendsPanel() {
  const { data: friendsData, isLoading } = useFriends()
  const { t } = useTranslation()

  if (isLoading) return <ConversationListSkeleton />

  if (!friendsData || friendsData.friends.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t("sidebar.noFriends")}
      </div>
    )
  }

  return (
    <>
      {friendsData.friends.map((item) => (
        <Link
          to={`/chat/${item.friend.id}`}
          key={item.id}
          className="flex items-center gap-3 border-b p-4 text-sm last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 shrink-0 rounded-full">
            <AvatarImage
              src={item.friend.avatar ?? undefined}
              alt={item.friend.displayName}
            />
            <AvatarFallback className="rounded-full text-xs">
              {item.friend.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {item.friend.displayName}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.friend.email}
            </div>
          </div>
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              item.friend.isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
            aria-label={item.friend.isOnline ? "Online" : "Offline"}
          />
        </Link>
      ))}
    </>
  )
}

function RequestsPanel() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentSubPath = location.pathname

  return (
    <div className="flex flex-col">
      <Link
        to="/requests/received"
        className={cn(
          "flex items-center gap-3 border-b p-4 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          currentSubPath === "/requests/received" &&
            "bg-sidebar-accent font-medium"
        )}
      >
        {t("requests.received")}
      </Link>
      <Link
        to="/requests/sent"
        className={cn(
          "flex items-center gap-3 border-b p-4 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          currentSubPath === "/requests/sent" && "bg-sidebar-accent font-medium"
        )}
      >
        {t("requests.sent")}
      </Link>
    </div>
  )
}

export function AppSidebar({ user }: { user: NavUserProfile | null }) {
  const location = useLocation()
  const currentPath = `/${location.pathname.split("/")[1]}`
  const activeItem =
    navMain.find((item) => item.url === currentPath) || navMain[0]

  const currentUserId = useAuthStore((state) => state.user?.id)
  const { t } = useTranslation()
  const [isAddFriendOpen, setIsAddFriendOpen] = React.useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false)

  return (
    <aside className="hidden h-svh w-[calc(var(--sidebar-width-icon)+1px+20rem)] shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground md:flex">
      {/* Icon sidebar */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-primary">
                    <img
                      src="/images/cowork-chat.png"
                      alt="CoworkChat"
                      className="size-8 object-cover"
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navMain.map((item) => {
                  const isActive = activeItem?.url === item.url
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton
                        tooltip={{
                          children: t(item.titleKey),
                          hidden: false,
                        }}
                        isActive={isActive}
                        className={cn(
                          "px-2.5 md:px-2",
                          isActive &&
                            "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                        )}
                        asChild
                      >
                        <Link to={item.url}>
                          {item.icon}
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      {/* Content panel */}
      <div className="hidden min-w-0 flex-1 flex-col bg-sidebar md:flex">
        <SidebarHeader className="h-16 justify-center border-b px-4 py-0">
          <div className="flex w-full items-center gap-2">
            <SidebarInput
              placeholder={t("sidebar.search")}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setIsAddFriendOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={t("sidebar.addFriend")}
            >
              <UserPlusIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={t("sidebar.createGroup")}
            >
              <UsersIcon className="size-4" />
            </button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {currentPath === "/friends" ? (
                <FriendsPanel />
              ) : currentPath === "/requests" ? (
                <RequestsPanel />
              ) : (
                <ConversationsPanel currentUserId={currentUserId} />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
      <AddFriendDialog
        open={isAddFriendOpen}
        onOpenChange={setIsAddFriendOpen}
      />
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
      />
    </aside>
  )
}
