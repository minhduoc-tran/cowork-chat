import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { CONVERSATION_ROUTES } from "../../routes"

import type {
  ConversationListItem,
  ConversationListResponse,
  ConversationMessage,
  ConversationMessageListResponse,
  ConversationMessageRecord,
  ConversationMessageWithReply,
  ConversationPin,
} from "./types"

function getConversationMessagesRoute(conversationId: number) {
  return CONVERSATION_ROUTES.MESSAGES.replace(
    ":conversationId",
    String(conversationId)
  )
}

function getConversationPinRoute(conversationId: number) {
  return CONVERSATION_ROUTES.PIN.replace(
    ":conversationId",
    String(conversationId)
  )
}

function unwrapMessage(
  item: ConversationMessage | ConversationMessageWithReply
): ConversationMessageRecord {
  if ("message" in item) {
    return { ...item.message, replyTo: item.replyTo }
  }

  return { ...item, replyTo: null }
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
    limit = 50,
    before?: number
  ): Promise<{ messages: ConversationMessageRecord[]; pin: ConversationPin | null }> => {
    const res = await apiClient.get<
      ApiResponse<ConversationMessageListResponse>
    >(getConversationMessagesRoute(conversationId), { params: { limit, before } })

    const messages = (res.data.data.messages ?? []).map(unwrapMessage).reverse()
    const pin = res.data.data.pin ?? null

    return { messages, pin }
  },

  pinMessage: (conversationId: number, messageId: number) =>
    apiClient.put<ApiResponse<{ pin: ConversationPin | null }>>(
      getConversationPinRoute(conversationId),
      { messageId }
    ),

  unpinMessage: (conversationId: number) =>
    apiClient.delete<ApiResponse<{ pin: ConversationPin | null }>>(
      getConversationPinRoute(conversationId)
    ),
}
