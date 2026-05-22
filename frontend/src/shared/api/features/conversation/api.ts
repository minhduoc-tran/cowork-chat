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

function getConversationPinsRoute(conversationId: number) {
  return CONVERSATION_ROUTES.PINS.replace(
    ":conversationId",
    String(conversationId)
  )
}

function getConversationUnpinRoute(conversationId: number, messageId: number) {
  return CONVERSATION_ROUTES.UNPIN.replace(
    ":conversationId",
    String(conversationId)
  ).replace(":messageId", String(messageId))
}

function getConversationRecallMessageRoute(
  conversationId: number,
  messageId: number
) {
  return CONVERSATION_ROUTES.RECALL_MESSAGE.replace(
    ":conversationId",
    String(conversationId)
  ).replace(":messageId", String(messageId))
}

function getConversationDeleteMessageRoute(
  conversationId: number,
  messageId: number
) {
  return CONVERSATION_ROUTES.DELETE_MESSAGE.replace(
    ":conversationId",
    String(conversationId)
  ).replace(":messageId", String(messageId))
}

function getConversationToggleReactionRoute(
  conversationId: number,
  messageId: number
) {
  return CONVERSATION_ROUTES.TOGGLE_REACTION.replace(
    ":conversationId",
    String(conversationId)
  ).replace(":messageId", String(messageId))
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
  ): Promise<{
    messages: ConversationMessageRecord[]
    pins: ConversationPin[]
  }> => {
    const res = await apiClient.get<
      ApiResponse<ConversationMessageListResponse>
    >(getConversationMessagesRoute(conversationId), {
      params: { limit, before },
    })

    const messages = (res.data.data.messages ?? []).map(unwrapMessage).reverse()
    const pins = res.data.data.pins ?? []

    return { messages, pins }
  },

  listPins: (conversationId: number) =>
    apiClient.get<ApiResponse<{ pins: ConversationPin[] }>>(
      getConversationPinsRoute(conversationId)
    ),

  pinMessage: (conversationId: number, messageId: number) =>
    apiClient.put<ApiResponse<{ pins: ConversationPin[] }>>(
      getConversationPinRoute(conversationId),
      { messageId }
    ),

  unpinMessage: (conversationId: number, messageId: number) =>
    apiClient.delete<ApiResponse<{ pins: ConversationPin[] }>>(
      getConversationUnpinRoute(conversationId, messageId)
    ),

  recallMessage: (conversationId: number, messageId: number) =>
    apiClient.put<ApiResponse<{ message: ConversationMessage }>>(
      getConversationRecallMessageRoute(conversationId, messageId)
    ),

  deleteMessage: (conversationId: number, messageId: number) =>
    apiClient.delete<ApiResponse<object>>(
      getConversationDeleteMessageRoute(conversationId, messageId)
    ),

  toggleMessageReaction: (
    conversationId: number,
    messageId: number,
    emoji: string
  ) =>
    apiClient.post<ApiResponse<{ message: ConversationMessage }>>(
      getConversationToggleReactionRoute(conversationId, messageId),
      { emoji }
    ),
}
