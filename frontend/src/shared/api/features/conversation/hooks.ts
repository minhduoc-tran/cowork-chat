import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

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
  return useInfiniteQuery({
    queryKey: ["conversations", conversationId, "messages", limit],
    queryFn: ({ pageParam }) =>
      conversationApi.listMessages(conversationId!, limit, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.messages.length > 0 ? lastPage.messages[0].id : undefined,
    enabled: conversationId !== null,
  })
}
