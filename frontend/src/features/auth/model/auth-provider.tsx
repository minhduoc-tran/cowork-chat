import { type ReactNode, useEffect, useState } from "react"

import {
  AuthContext,
  type AuthContextValue,
  SESSION_KEY,
  type User,
} from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as User
        if (parsed && parsed.email) {
          queueMicrotask(() => setUser(parsed))
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  const login = async (email: string, _password: string) => {
    const newUser: User = { email }
    setUser(newUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const register = async (
    email: string,
    _password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const newUser: User = { email, firstName, lastName }
    setUser(newUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser))
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isHydrated,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
