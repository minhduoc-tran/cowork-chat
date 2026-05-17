import { createContext } from "react"

const SESSION_KEY = "cowork-chat-session"

interface User {
  email: string
  firstName?: string
  lastName?: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export { AuthContext, type AuthContextValue, SESSION_KEY, type User }
