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

export interface FoundUser {
  id: number
  email: string
  displayName: string
  avatar: string | null
}

export interface FindUserByEmailResponse {
  user: FoundUser
  isFriend: boolean
}

export interface SendFriendRequestResponse {
  request: {
    id: number
    senderId: number
    receiverId: number
    status: string
    createdAt: string
  }
}
