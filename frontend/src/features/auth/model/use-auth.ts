import { useAuthStore } from "./auth-store"
import type { AuthContextValue } from "./auth-context"

export function useAuth(): AuthContextValue {
  return useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isHydrated: state.isHydrated,
    login: state.login,
    logout: state.logout,
    register: state.register,
  }))
}
