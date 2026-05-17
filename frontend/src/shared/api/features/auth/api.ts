import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { AUTH_ROUTES } from "../../routes"

import type {
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterResponse,
} from "./types"

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<LoginResponse>>(AUTH_ROUTES.LOGIN, {
      email,
      password,
    }),

  register: (email: string, password: string, displayName: string) =>
    apiClient.post<ApiResponse<RegisterResponse>>(AUTH_ROUTES.REGISTER, {
      email,
      password,
      displayName,
    }),

  logout: () => apiClient.post<ApiResponse<null>>(AUTH_ROUTES.LOGOUT),

  refresh: () =>
    apiClient.post<ApiResponse<RefreshResponse>>(AUTH_ROUTES.REFRESH),

  me: () => apiClient.get<ApiResponse<MeResponse>>(AUTH_ROUTES.ME),
}