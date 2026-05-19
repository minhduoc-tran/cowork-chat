import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"

import { getCsrfHeaderValue } from "./csrf"
import { AUTH_ROUTES } from "./routes"

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080"

export const ACCESS_TOKEN_KEY = "cowork-chat-access-token"
export const CSRF_TOKEN_KEY = "csrf_token"

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  statusCode: number
  data: T
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const csrfToken = getCsrfHeaderValue(
      config.method,
      typeof document === "undefined" ? "" : document.cookie,
      CSRF_TOKEN_KEY
    )
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken
    }

    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await apiClient.post(AUTH_ROUTES.REFRESH)
        const newAccessToken = data.data.accessToken

        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

        processQueue(null, newAccessToken)
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.location.href = "/login"
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
