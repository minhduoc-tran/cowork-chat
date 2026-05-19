export interface AuthUser {
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

export interface LoginResponse {
  user: AuthUser
  accessToken: string
  expiresIn: number
}

export interface RegisterResponse {
  user: AuthUser
  accessToken: string
  expiresIn: number
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

export interface MeResponse {
  user: AuthUser
}
