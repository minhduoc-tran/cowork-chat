import { useMutation, useQuery } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth"

import { userApi } from "./api"
import type { UpdateProfileInput } from "./types"

export function useUpdateProfile() {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      userApi.updateProfile(data).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success && data.data.user) {
        setAuth(data.data.user)
      }
    },
  })
}

export function useFindUserByEmail(email: string) {
  return useQuery({
    queryKey: ["users", "by-email", email],
    queryFn: () => userApi.findByEmail(email).then((res) => res.data.data),
    enabled: email.length > 0 && email.includes("@"),
    retry: false,
  })
}

export function useSendFriendRequest() {
  return useMutation({
    mutationFn: (receiverId: number) =>
      userApi.sendFriendRequest(receiverId).then((res) => res.data),
  })
}
