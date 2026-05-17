import { createContext } from "react"

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

const AuthContext = createContext(false)

export { AuthContext, type AuthContextValue }
