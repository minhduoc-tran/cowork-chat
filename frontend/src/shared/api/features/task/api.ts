import type { ApiResponse } from "../../client"
import { apiClient } from "../../client"
import { TASK_ROUTES } from "../../routes"

import type {
  CreateSubtaskPayload,
  CreateTaskPayload,
  Task,
  UpdateSubtaskPayload,
  UpdateTaskPayload,
  TaskMember,
  ConversationTag,
  TaskTag,
} from "./types"

export const taskApi = {
  list: (
    conversationId?: number,
    limit?: number,
    offset?: number,
    search?: string,
    queryParams?: Record<string, string | string[] | undefined>
  ) =>
    apiClient.get<ApiResponse<Task[]>>(TASK_ROUTES.BASE, {
      params: {
        ...(conversationId ? { conversationId } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(offset !== undefined ? { offset } : {}),
        ...(search ? { search } : {}),
        ...(queryParams || {}),
      },
    }),

  create: (data: CreateTaskPayload) =>
    apiClient.post<ApiResponse<Task>>(TASK_ROUTES.BASE, data),

  update: (taskId: number, data: UpdateTaskPayload) =>
    apiClient.patch<ApiResponse<Task>>(
      TASK_ROUTES.DETAIL.replace(":taskId", String(taskId)),
      data
    ),

  delete: (taskId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(
      TASK_ROUTES.DETAIL.replace(":taskId", String(taskId))
    ),

  createSubtask: (taskId: number, data: CreateSubtaskPayload) =>
    apiClient.post<ApiResponse<Task>>(
      TASK_ROUTES.SUBTASKS.replace(":taskId", String(taskId)),
      data
    ),

  updateSubtask: (
    taskId: number,
    subtaskId: number,
    data: UpdateSubtaskPayload
  ) =>
    apiClient.patch<ApiResponse<Task>>(
      TASK_ROUTES.SUBTASK_DETAIL.replace(":taskId", String(taskId)).replace(
        ":subtaskId",
        String(subtaskId)
      ),
      data
    ),

  deleteSubtask: (taskId: number, subtaskId: number) =>
    apiClient.delete<ApiResponse<Task>>(
      TASK_ROUTES.SUBTASK_DETAIL.replace(":taskId", String(taskId)).replace(
        ":subtaskId",
        String(subtaskId)
      )
    ),

  // Member Management API
  addTaskMember: (taskId: number, userId: number, role: "owner" | "assignee" | "watcher") =>
    apiClient.post<ApiResponse<TaskMember>>(`/api/v1/tasks/${taskId}/members`, { userId, role }),

  removeTaskMember: (taskId: number, userId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/v1/tasks/${taskId}/members/${userId}`),

  updateTaskMemberRole: (taskId: number, userId: number, role: "assignee" | "watcher") =>
    apiClient.patch<ApiResponse<TaskMember>>(`/api/v1/tasks/${taskId}/members/${userId}`, { role }),

  // Tag Management API
  createConversationTag: (conversationId: number, data: { name: string; color: string; icon?: string }) =>
    apiClient.post<ApiResponse<ConversationTag>>(`/api/v1/conversations/${conversationId}/tags`, data),

  listConversationTags: (conversationId: number) =>
    apiClient.get<ApiResponse<ConversationTag[]>>(`/api/v1/conversations/${conversationId}/tags`),

  deleteConversationTag: (conversationId: number, tagId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/v1/conversations/${conversationId}/tags/${tagId}`),

  addTagToTask: (taskId: number, tagId: number) =>
    apiClient.post<ApiResponse<TaskTag>>(`/api/v1/tasks/${taskId}/tags`, { tagId }),

  removeTagFromTask: (taskId: number, tagId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/v1/tasks/${taskId}/tags/${tagId}`),
}
