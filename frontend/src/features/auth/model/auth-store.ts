import { create } from "zustand"

const SESSION_KEY = "cowork-chat-session"

export interface User {
  id: string
  email: string
  displayName: string
  avatar: string | null
  coverPhoto: string | null
  bio: string | null
  gender: string | null
  dateOfBirth: string | null
  phone: string | null
}

interface AuthState {
  user: User | null
  isHydrated: boolean
  isAuthenticated: boolean
  hydrateSession: () => void
  setAuth: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,
  isAuthenticated: false,
  hydrateSession: () => {
    if (get().isHydrated) return

    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) {
        set({ isAuthenticated: false, isHydrated: true, user: null })
        return
      }

      const parsed = JSON.parse(stored) as User
      const user = parsed && parsed.email ? parsed : null
      set({
        isAuthenticated: !!user,
        isHydrated: true,
        user,
      })
    } catch {
      localStorage.removeItem(SESSION_KEY)
      set({ isAuthenticated: false, isHydrated: true, user: null })
    }
  },
  setAuth: (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    set({ isAuthenticated: true, isHydrated: true, user })
  },
  clearAuth: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ isAuthenticated: false, isHydrated: true, user: null })
  },
}))

export function hydrateAuthSession() {
  useAuthStore.getState().hydrateSession()
}
