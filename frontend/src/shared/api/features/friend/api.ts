import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { FRIEND_ROUTES } from "../../routes"

import type { FriendListResponse } from "./types"

export const friendApi = {
  list: () =>
    apiClient.get<ApiResponse<FriendListResponse>>(FRIEND_ROUTES.LIST),
}
