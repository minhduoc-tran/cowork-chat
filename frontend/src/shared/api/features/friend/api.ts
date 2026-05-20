import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { FRIEND_ROUTES } from "../../routes"

import type {
  FriendListResponse,
  PendingRequestsResponse,
  SentRequestsResponse,
} from "./types"

export const friendApi = {
  list: () =>
    apiClient.get<ApiResponse<FriendListResponse>>(FRIEND_ROUTES.LIST),

  listPendingRequests: () =>
    apiClient.get<ApiResponse<PendingRequestsResponse>>(
      FRIEND_ROUTES.PENDING_REQUESTS
    ),

  listSentRequests: () =>
    apiClient.get<ApiResponse<SentRequestsResponse>>(
      FRIEND_ROUTES.SENT_REQUESTS
    ),

  acceptRequest: (requestId: number) =>
    apiClient.post<ApiResponse<null>>(
      FRIEND_ROUTES.ACCEPT_REQUEST.replace(":requestId", String(requestId))
    ),

  rejectRequest: (requestId: number) =>
    apiClient.post<ApiResponse<null>>(
      FRIEND_ROUTES.REJECT_REQUEST.replace(":requestId", String(requestId))
    ),
}
