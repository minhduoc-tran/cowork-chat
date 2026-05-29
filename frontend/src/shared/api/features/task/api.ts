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
  TaskComment,
  CreateCommentPayload,
  UpdateCommentPayload,
  TaskStatus,
  CreateTaskStatusPayload,
  UpdateTaskStatusPayload,
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

  getById: (taskId: number) =>
    apiClient.get<ApiResponse<Task>>(
      TASK_ROUTES.DETAIL.replace(":taskId", String(taskId))
    ),

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

  // Comment Management API
  listComments: (taskId: number) =>
    apiClient.get<ApiResponse<TaskComment[]>>(`/api/v1/tasks/${taskId}/comments`),

  createComment: (taskId: number, data: CreateCommentPayload) =>
    apiClient.post<ApiResponse<TaskComment>>(`/api/v1/tasks/${taskId}/comments`, data),

  updateComment: (taskId: number, commentId: number, data: UpdateCommentPayload) =>
    apiClient.patch<ApiResponse<TaskComment>>(`/api/v1/tasks/${taskId}/comments/${commentId}`, data),

  deleteComment: (taskId: number, commentId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/v1/tasks/${taskId}/comments/${commentId}`),

  // Task Status Management API
  listStatuses: (conversationId: number | null) =>
    apiClient.get<ApiResponse<TaskStatus[]>>(`/api/v1/conversations/${conversationId ?? 0}/task-statuses`),

  createStatus: (conversationId: number, data: CreateTaskStatusPayload) =>
    apiClient.post<ApiResponse<TaskStatus>>(`/api/v1/conversations/${conversationId}/task-statuses`, data),

  updateStatus: (conversationId: number, statusId: number, data: UpdateTaskStatusPayload) =>
    apiClient.patch<ApiResponse<TaskStatus>>(`/api/v1/conversations/${conversationId}/task-statuses/${statusId}`, data),

  deleteStatus: (conversationId: number, statusId: number) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/v1/conversations/${conversationId}/task-statuses/${statusId}`),
}
