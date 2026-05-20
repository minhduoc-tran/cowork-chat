import { useQuery } from "@tanstack/react-query"

import { conversationApi } from "./api"

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => conversationApi.list().then((res) => res.data.data),
  })
}

export function useDirectConversation(targetUserId: number | null) {
  return useQuery({
    queryKey: ["conversations", "direct", targetUserId],
    queryFn: () => conversationApi.findDirectConversationByUserId(targetUserId!),
    enabled: targetUserId !== null,
  })
}

export function useConversationMessages(
  conversationId: number | null,
  limit = 50
) {
  return useQuery({
    queryKey: ["conversations", conversationId, "messages", limit],
    queryFn: () => conversationApi.listMessages(conversationId!, limit),
    enabled: conversationId !== null,
  })
}
