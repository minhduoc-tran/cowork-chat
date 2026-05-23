import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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
    queryFn: () =>
      conversationApi.findDirectConversationByUserId(targetUserId!),
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

export function useConversationPins(conversationId: number | null) {
  return useQuery({
    queryKey: ["pins", conversationId],
    queryFn: () =>
      conversationApi
        .listPins(conversationId!)
        .then((res) => res.data.data.pins ?? []),
    enabled: conversationId !== null,
  })
}

export function useToggleMessageReaction() {
  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      emoji,
    }: {
      conversationId: number
      messageId: number
      emoji: string
    }) =>
      conversationApi
        .toggleMessageReaction(conversationId, messageId, emoji)
        .then((res) => res.data.data),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: number[] }) =>
      conversationApi.createGroup(name, memberIds).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
  })
}

export function useLeaveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) =>
      conversationApi.leaveGroup(conversationId).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      name,
      memberIds,
    }: {
      conversationId: number
      name?: string
      memberIds?: number[]
    }) =>
      conversationApi
        .updateGroup(conversationId, { name, memberIds })
        .then((res) => res.data.data),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] })
      void queryClient.invalidateQueries({
        queryKey: ["conversations", variables.conversationId, "messages"],
      })
    },
  })
}

