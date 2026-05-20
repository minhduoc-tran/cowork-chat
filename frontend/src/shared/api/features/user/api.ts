import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { FRIEND_ROUTES, USER_ROUTES } from "../../routes"

import type {
  FindUserByEmailResponse,
  SendFriendRequestResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
} from "./types"

export const userApi = {
  updateProfile: (data: UpdateProfileInput) =>
    apiClient.patch<ApiResponse<UpdateProfileResponse>>(
      USER_ROUTES.UPDATE_PROFILE,
      data
    ),

  findByEmail: (email: string) =>
    apiClient.get<ApiResponse<FindUserByEmailResponse>>(
      USER_ROUTES.FIND_BY_EMAIL,
      { params: { email } }
    ),

  sendFriendRequest: (receiverId: number) =>
    apiClient.post<ApiResponse<SendFriendRequestResponse>>(
      FRIEND_ROUTES.SEND_REQUEST,
      { receiverId }
    ),
}
