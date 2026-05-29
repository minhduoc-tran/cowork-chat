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
  PIN: "/api/v1/conversations/:conversationId/pin",
  PINS: "/api/v1/conversations/:conversationId/pins",
  UNPIN: "/api/v1/conversations/:conversationId/pins/:messageId",
  RECALL_MESSAGE:
    "/api/v1/conversations/:conversationId/messages/:messageId/recall",
  DELETE_MESSAGE: "/api/v1/conversations/:conversationId/messages/:messageId",
  TOGGLE_REACTION:
    "/api/v1/conversations/:conversationId/messages/:messageId/reactions",
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

export const TASK_ROUTES = {
  BASE: "/api/v1/tasks",
  DETAIL: "/api/v1/tasks/:taskId",
  SUBTASKS: "/api/v1/tasks/:taskId/subtasks",
  SUBTASK_DETAIL: "/api/v1/tasks/:taskId/subtasks/:subtaskId",
} as const

export const NOTIFICATION_ROUTES = {
  LIST: "/api/v1/notifications",
  UNREAD_COUNT: "/api/v1/notifications/unread-count",
  READ_ALL: "/api/v1/notifications/read-all",
  MARK_READ: "/api/v1/notifications/:notificationId/read",
} as const
