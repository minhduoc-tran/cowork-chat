"use client"

import {
  ArchiveXIcon,
  FileIcon,
  MessageCircleIcon,
  SendIcon,
  SquarePenIcon,
  TerminalIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

import { useAuthStore } from "@/features/auth"

import type { ConversationListItem } from "@/shared/api"
import { useConversations, useFriends } from "@/shared/api"
import { type NavUserProfile } from "@/shared/lib/nav-user.utils"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
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
  // Direct: tìm member khác mình (chỉ có userId, chưa có displayName từ API)
  const otherMember = item.members.find((m) => m.userId !== currentUserId)
  return otherMember ? `User #${otherMember.userId}` : "Cuộc trò chuyện"
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
        <a
          href="#"
          key={item.conversation.id}
          className="flex flex-col items-start gap-1.5 border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
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
          {item.lastMessage && (
            <span className="line-clamp-1 min-w-0 text-xs text-muted-foreground">
              {item.lastMessage.content || t("sidebar.systemMessage")}
            </span>
          )}
          {!item.lastMessage && (
            <span className="text-xs text-muted-foreground">
              {t("sidebar.noMessages")}
            </span>
          )}
        </a>
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
        <a
          href="#"
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
        </a>
      ))}
    </>
  )
}

export function AppSidebar({ user }: { user: NavUserProfile | null }) {
  const location = useLocation()
  const currentPath = `/${location.pathname.split("/")[1]}`
  const activeItem =
    navMain.find((item) => item.url === currentPath) || navMain[0]

  const currentUserId = useAuthStore((state) => state.user?.id)
  const { t } = useTranslation()

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
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <TerminalIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">CoworkChat</span>
                    <span className="truncate text-xs">Workspace</span>
                  </div>
                </a>
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
        <SidebarHeader className="border-b p-4">
          <div className="flex w-full items-center gap-2">
            <SidebarInput
              placeholder={t("sidebar.search")}
              className="flex-1"
            />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={t("sidebar.newChat")}
            >
              <SquarePenIcon className="size-4" />
            </button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {currentPath === "/friends" ? (
                <FriendsPanel />
              ) : (
                <ConversationsPanel currentUserId={currentUserId} />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </aside>
  )
}
