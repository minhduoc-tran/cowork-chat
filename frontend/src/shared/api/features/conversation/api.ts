import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { CONVERSATION_ROUTES } from "../../routes"

import type { ConversationListResponse } from "./types"

export const conversationApi = {
  list: () =>
    apiClient.get<ApiResponse<ConversationListResponse>>(
      CONVERSATION_ROUTES.LIST
    ),
}
