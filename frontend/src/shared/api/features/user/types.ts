import type { AuthUser } from "../auth/types"

export interface UpdateProfileInput {
  displayName?: string
  bio?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  phone?: string | null
}

export interface UpdateProfileResponse {
  user: AuthUser
}
