import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { taskApi } from "./api"
import type {
  CreateSubtaskPayload,
  CreateTaskPayload,
  UpdateSubtaskPayload,
  UpdateTaskPayload,
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
