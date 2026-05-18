import { type ReactNode } from "react"

import { useAuthStore } from "@/features/auth"
import { buildNavUserProfile } from "@/shared/ui/nav-user.utils"
import { SidebarProvider } from "@/shared/ui/sidebar"
import { AppSidebar } from "@/shared/ui/app-sidebar"

export function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const currentUser = user ? buildNavUserProfile(user) : null

  return (
    <SidebarProvider>
      <AppSidebar user={currentUser} />
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </SidebarProvider>
  )
}
