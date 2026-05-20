export interface FriendUser {
  id: number
  email: string
  displayName: string
  avatar: string | null
  isOnline: boolean
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FriendshipItem {
  id: number
  userId: number
  friendId: number
  createdAt: string
  friend: FriendUser
}

export interface FriendListResponse {
  friends: FriendshipItem[]
}

export interface FriendRequest {
  id: number
  senderId: number
  receiverId: number
  status: string
  createdAt: string
  updatedAt: string
  sender?: FriendUser
  receiver?: FriendUser
}

export interface PendingRequestsResponse {
  requests: FriendRequest[]
}

export interface SentRequestsResponse {
  requests: FriendRequest[]
}
