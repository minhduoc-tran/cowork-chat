import { type ReactNode, useContext } from "react"
import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/features/auth"
import { AuthContext } from "@/features/auth/model/auth-context"

export function PublicRoute({ children }: { children: ReactNode }) {
  const hasProvider = useContext(AuthContext)
  if (!hasProvider) throw new Error("useAuth must be used within AuthProvider")

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  if (!isHydrated) return null

  if (isAuthenticated) return <Navigate to="/" replace />

  return <>{children}</>
}
