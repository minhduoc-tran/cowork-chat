import { type ReactNode } from "react"

import { useAuthStore } from "@/features/auth"

import { buildNavUserProfile } from "@/shared/lib/nav-user.utils"
import { AppSidebar } from "@/shared/ui/app-sidebar"
import { SidebarProvider } from "@/shared/ui/sidebar"

export function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const currentUser = user ? buildNavUserProfile(user) : null

  return (
    <SidebarProvider>
      <AppSidebar user={currentUser} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </SidebarProvider>
  )
}
