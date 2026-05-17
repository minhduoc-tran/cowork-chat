import { type ReactNode, useEffect } from "react"

import { hydrateAuthSession } from "./auth-store"

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    hydrateAuthSession()
  }, [])

  return <>{children}</>
}
