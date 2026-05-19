import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { USER_ROUTES } from "../../routes"

import type { UpdateProfileInput, UpdateProfileResponse } from "./types"

export const userApi = {
  updateProfile: (data: UpdateProfileInput) =>
    apiClient.patch<ApiResponse<UpdateProfileResponse>>(
      USER_ROUTES.UPDATE_PROFILE,
      data
    ),
}
