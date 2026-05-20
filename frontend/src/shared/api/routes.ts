export const AUTH_ROUTES = {
  LOGIN: "/api/v1/auth/login",
  REGISTER: "/api/v1/auth/register",
  LOGOUT: "/api/v1/auth/logout",
  REFRESH: "/api/v1/auth/refresh",
  ME: "/api/v1/auth/me",
} as const

export const CONVERSATION_ROUTES = {
  LIST: "/api/v1/conversations",
  MESSAGES: "/api/v1/conversations/:conversationId/messages",
  CREATE_GROUP: "/api/v1/conversations/groups",
} as const

export const FRIEND_ROUTES = {
  LIST: "/api/v1/friends",
  PENDING_REQUESTS: "/api/v1/friends/requests/pending",
  SENT_REQUESTS: "/api/v1/friends/requests/sent",
  SEND_REQUEST: "/api/v1/friends/requests",
  ACCEPT_REQUEST: "/api/v1/friends/requests/:requestId/accept",
  REJECT_REQUEST: "/api/v1/friends/requests/:requestId/reject",
} as const

export const USER_ROUTES = {
  UPDATE_PROFILE: "/api/v1/users/me",
  FIND_BY_EMAIL: "/api/v1/users/by-email",
} as const
