import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth"

import { ACCESS_TOKEN_KEY, apiClient, CSRF_TOKEN_KEY } from "../../client"
import { getCookieValue } from "../../csrf"

import { authApi } from "./api"
import type { LoginResponse, RefreshResponse, RegisterResponse } from "./types"

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password).then((res) => res.data),

    onSuccess: (data) => {
      if (!data.success) return Promise.reject(new Error(data.message))
      const { user, accessToken } = data.data as LoginResponse
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      setAuth(user)
      queryClient.clear()
    },
  })
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      email,
      password,
      displayName,
    }: {
      email: string
      password: string
      displayName: string
    }) =>
      authApi.register(email, password, displayName).then((res) => res.data),

    onSuccess: (data) => {
      if (!data.success) return Promise.reject(new Error(data.message))
      const { user, accessToken } = data.data as RegisterResponse
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      setAuth(user)
      queryClient.clear()
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const csrfToken = getCookieValue(
        typeof document === "undefined" ? "" : document.cookie,
        CSRF_TOKEN_KEY
      )

      if (!csrfToken) {
        const refreshResponse = await authApi.refresh().then((res) => res.data)

        if (refreshResponse.success) {
          const { accessToken } = refreshResponse.data as RefreshResponse
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`
        }
      }

      return authApi.logout().then((res) => res.data)
    },

    onSettled: () => {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      clearAuth()
      queryClient.clear()
    },
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me().then((res) => res.data),
    retry: 1,
    staleTime: 60_000,
  })
}
