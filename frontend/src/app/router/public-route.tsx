import { type ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/features/auth"

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuth()

  if (!isHydrated) return null

  if (isAuthenticated) return <Navigate to="/" replace />

  return <>{children}</>
}
