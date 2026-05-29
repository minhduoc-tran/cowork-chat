export type NotificationType =
  | "task_assigned"
  | "task_mention"
  | "message_mention"

export interface NotificationData {
  conversationId?: number | null
  taskId?: number | null
  messageId?: number | null
  commentId?: number | null
  taskTitle?: string | null
  conversationName?: string | null
  preview?: string | null
}

export interface NotificationActor {
  id: number
  displayName: string
  avatar: string | null
}

export interface Notification {
  id: number
  userId: number
  actorId: number | null
  type: NotificationType
  data: NotificationData | null
  isRead: boolean
  createdAt: string
  actor: NotificationActor | null
}

export interface NotificationListResponse {
  notifications: Notification[]
  unreadCount: number
}

export interface UnreadCountResponse {
  unreadCount: number
}
