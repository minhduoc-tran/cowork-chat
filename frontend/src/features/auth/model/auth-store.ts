import { create } from "zustand"

const SESSION_KEY = "cowork-chat-session"

export interface User {
  email: string
  firstName?: string
  lastName?: string
}

interface AuthState {
  user: User | null
  isHydrated: boolean
  isAuthenticated: boolean
  hydrateSession: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>
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
  login: async (email, _password) => {
    const user: User = { email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    set({ isAuthenticated: true, isHydrated: true, user })
  },
  logout: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ isAuthenticated: false, isHydrated: true, user: null })
  },
  register: async (email, _password, firstName, lastName) => {
    const user: User = { email, firstName, lastName }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    set({ isAuthenticated: true, isHydrated: true, user })
  },
}))

export function hydrateAuthSession() {
  useAuthStore.getState().hydrateSession()
}
