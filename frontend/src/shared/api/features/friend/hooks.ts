import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { friendApi } from "./api"

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: () => friendApi.list().then((res) => res.data.data),
  })
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "pending"],
    queryFn: () => friendApi.listPendingRequests().then((res) => res.data.data),
  })
}

export function useSentRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "sent"],
    queryFn: () => friendApi.listSentRequests().then((res) => res.data.data),
  })
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: number) =>
      friendApi.acceptRequest(requestId).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: number) =>
      friendApi.rejectRequest(requestId).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["friends", "requests"],
      })
    },
  })
}
