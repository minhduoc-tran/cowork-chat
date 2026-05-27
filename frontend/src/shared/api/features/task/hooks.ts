import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { taskApi } from "./api"
import type {
  CreateSubtaskPayload,
  CreateTaskPayload,
  UpdateSubtaskPayload,
  UpdateTaskPayload,
  CreateCommentPayload,
  UpdateCommentPayload,
} from "./types"

export function useTasks(conversationId?: number | null) {
  return useQuery({
    queryKey: ["tasks", conversationId ?? null],
    queryFn: () =>
      taskApi
        .list(conversationId ?? undefined)
        .then((res) => res.data.data ?? []),
  })
}

export function useTask(taskId: number | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () =>
      taskId
        ? taskApi.getById(taskId).then((res) => res.data.data)
        : Promise.resolve(null),
    enabled: !!taskId,
  })
}

export function useInfiniteTasks(
  conversationId?: number | null,
  limit = 15,
  search?: string,
  queryParams?: Record<string, string | string[] | undefined>
) {
  return useInfiniteQuery({
    queryKey: ["tasks", conversationId ?? null, "infinite", limit, search ?? "", queryParams ?? {}],
    queryFn: ({ pageParam = 0 }) =>
      taskApi
        .list(conversationId ?? undefined, limit, pageParam as number, search, queryParams)
        .then((res) => res.data.data ?? []),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length * limit : undefined
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      taskApi.create(payload).then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", data.conversationId],
      })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: UpdateTaskPayload
    }) => taskApi.update(taskId, payload).then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", data.conversationId],
      })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
    }: {
      taskId: number
      conversationId: number | null
    }) => taskApi.delete(taskId).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.conversationId],
      })
    },
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number
      payload: CreateSubtaskPayload
    }) => taskApi.createSubtask(taskId, payload).then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", data.conversationId],
      })
    },
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      subtaskId,
      payload,
    }: {
      taskId: number
      subtaskId: number
      payload: UpdateSubtaskPayload
    }) =>
      taskApi
        .updateSubtask(taskId, subtaskId, payload)
        .then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", data.conversationId],
      })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      subtaskId,
    }: {
      taskId: number
      subtaskId: number
    }) => taskApi.deleteSubtask(taskId, subtaskId).then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", data.conversationId],
      })
    },
  })
}

// Member Management Hooks
export function useAddTaskMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId, role }: { taskId: number; userId: number; role: "owner" | "assignee" | "watcher" }) =>
      taskApi.addTaskMember(taskId, userId, role).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

export function useRemoveTaskMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: number }) =>
      taskApi.removeTaskMember(taskId, userId).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

export function useUpdateTaskMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId, role }: { taskId: number; userId: number; role: "assignee" | "watcher" }) =>
      taskApi.updateTaskMemberRole(taskId, userId, role).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

// Tag Management Hooks
export function useConversationTags(conversationId?: number | null) {
  return useQuery({
    queryKey: ["conversation_tags", conversationId ?? null],
    queryFn: () =>
      conversationId
        ? taskApi.listConversationTags(conversationId).then((res) => res.data.data ?? [])
        : Promise.resolve([]),
    enabled: !!conversationId,
  })
}

export function useCreateConversationTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: number; data: { name: string; color: string; icon?: string } }) =>
      taskApi.createConversationTag(conversationId, data).then((res) => res.data.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["conversation_tags", data.conversationId],
      })
    },
  })
}

export function useDeleteConversationTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, tagId }: { conversationId: number; tagId: number }) =>
      taskApi.deleteConversationTag(conversationId, tagId).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["conversation_tags", variables.conversationId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.conversationId],
      })
    },
  })
}

export function useAddTagToTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: number; tagId: number }) =>
      taskApi.addTagToTask(taskId, tagId).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

export function useRemoveTagFromTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: number; tagId: number }) =>
      taskApi.removeTagFromTask(taskId, tagId).then((res) => res.data.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

// Comment Management Hooks
export function useTaskComments(taskId: number | null) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    queryFn: () =>
      taskId
        ? taskApi.listComments(taskId).then((res) => res.data.data ?? [])
        : Promise.resolve([]),
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: CreateCommentPayload }) =>
      taskApi.createComment(taskId, payload).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["task_comments", variables.taskId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, commentId, payload }: { taskId: number; commentId: number; payload: UpdateCommentPayload }) =>
      taskApi.updateComment(taskId, commentId, payload).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["task_comments", variables.taskId],
      })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: number; commentId: number }) =>
      taskApi.deleteComment(taskId, commentId).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["task_comments", variables.taskId],
      })
    },
  })
}
