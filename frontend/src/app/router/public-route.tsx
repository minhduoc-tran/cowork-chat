import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/features/auth"

export function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  if (!isHydrated) return null

  if (isAuthenticated) return <Navigate to="/" replace />

  return <>{children}</>
}
