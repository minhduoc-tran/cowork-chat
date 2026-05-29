import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { notificationApi } from "./api"

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.list().then((res) => res.data.data),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      notificationApi.unreadCount().then((res) => res.data.data.unreadCount),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationApi.markAsRead(notificationId).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      notificationApi.markAllAsRead().then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
