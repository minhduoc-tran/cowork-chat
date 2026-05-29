import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { NOTIFICATION_ROUTES } from "../../routes"

import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from "./types"

export const notificationApi = {
  list: (limit = 30, offset = 0) =>
    apiClient.get<ApiResponse<NotificationListResponse>>(
      NOTIFICATION_ROUTES.LIST,
      { params: { limit, offset } }
    ),

  unreadCount: () =>
    apiClient.get<ApiResponse<UnreadCountResponse>>(
      NOTIFICATION_ROUTES.UNREAD_COUNT
    ),

  markAsRead: (notificationId: number) =>
    apiClient.patch<ApiResponse<Notification>>(
      NOTIFICATION_ROUTES.MARK_READ.replace(
        ":notificationId",
        String(notificationId)
      )
    ),

  markAllAsRead: () =>
    apiClient.patch<ApiResponse<{ success: boolean }>>(
      NOTIFICATION_ROUTES.READ_ALL
    ),
}
