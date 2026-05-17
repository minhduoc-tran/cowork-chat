import { type ReactNode, useEffect } from "react"

import { AuthContext } from "./auth-context"
import { hydrateAuthSession, useAuthStore } from "./auth-store"

export function AuthProvider({ children }: { children: ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated)

  useEffect(() => {
    hydrateAuthSession()
  }, [])

  if (!isHydrated) return null

  return <AuthContext.Provider value>{children}</AuthContext.Provider>
}
