import { useMutation } from "@tanstack/react-query"

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
