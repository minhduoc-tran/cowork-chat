import * as React from "react"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { useLogout } from "@/shared/api/features/auth/hooks"
import { type NavUserProfile } from "@/shared/lib/nav-user.utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { ProfileDialog } from "@/shared/ui/profile-dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar"

export function NavUser({ user }: { user: NavUserProfile | null }) {
  const { isMobile } = useSidebar()
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const logout = useLogout()
  const { t, i18n } = useTranslation()

  if (!user) return null

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user.avatar ?? undefined}
                      alt={user.name}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  <UserIcon />
                  {t("userMenu.profile")}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <GlobeIcon />
                    {t("userMenu.language")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={() => i18n.changeLanguage("vi")}
                      >
                        <span>🇻🇳</span>
                        {t("language.vi")}
                        {i18n.language === "vi" && (
                          <CheckIcon className="ml-auto size-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => i18n.changeLanguage("en")}
                      >
                        <span>🇺🇸</span>
                        {t("language.en")}
                        {i18n.language === "en" && (
                          <CheckIcon className="ml-auto size-4" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
                <LogOutIcon />
                {t("userMenu.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!logout.isPending) setIsConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logout.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={logout.isPending}
              onClick={() => setIsConfirmOpen(false)}
            >
              {t("logout.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={logout.isPending}
              onClick={() => {
                void logout.mutateAsync()
              }}
            >
              {logout.isPending ? t("logout.confirming") : t("logout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
