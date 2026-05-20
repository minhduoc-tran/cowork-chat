import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { CONVERSATION_ROUTES } from "../../routes"

import type {
  ConversationListItem,
  ConversationListResponse,
  ConversationMessage,
  ConversationMessageListResponse,
  ConversationMessageWithReply,
} from "./types"

function getConversationMessagesRoute(conversationId: number) {
  return CONVERSATION_ROUTES.MESSAGES.replace(
    ":conversationId",
    String(conversationId)
  )
}

function unwrapMessage(
  item: ConversationMessage | ConversationMessageWithReply
): ConversationMessage {
  return "message" in item ? item.message : item
}

export const conversationApi = {
  list: () =>
    apiClient.get<ApiResponse<ConversationListResponse>>(
      CONVERSATION_ROUTES.LIST
    ),

  findDirectConversationByUserId: async (
    userId: number
  ): Promise<ConversationListItem | null> => {
    const res = await conversationApi.list()
    const conversations = res.data.data.conversations ?? []

    return (
      conversations.find(
        (item) =>
          item.conversation.type === "direct" &&
          item.members.some((member) => member.userId === userId)
      ) ?? null
    )
  },

  listMessages: async (
    conversationId: number,
    limit = 50
  ): Promise<ConversationMessage[]> => {
    const res = await apiClient.get<ApiResponse<ConversationMessageListResponse>>(
      getConversationMessagesRoute(conversationId),
      { params: { limit } }
    )

    return (res.data.data.messages ?? []).map(unwrapMessage).reverse()
  },
}
