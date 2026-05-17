import { useContext } from "react"

import { AuthContext, type AuthContextValue } from "./auth-context"
import { useAuthStore } from "./auth-store"

export function useAuth(): AuthContextValue {
  const hasProvider = useContext(AuthContext)
  if (!hasProvider) throw new Error("useAuth must be used within AuthProvider")

  return useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isHydrated: state.isHydrated,
    login: state.login,
    logout: state.logout,
    register: state.register,
  }))
}
