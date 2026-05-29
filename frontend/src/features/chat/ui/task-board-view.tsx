import * as React from "react"
import { CalendarIcon, LayoutGridIcon, ListIcon, Loader2Icon, PlusIcon, SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { Task } from "@/shared/api"
import { useTasks, useUpdateTask, taskApi, useTaskStatuses, useCreateTaskStatus, useUpdateTaskStatus, useDeleteTaskStatus } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { FilterProvider, FilterRoot } from "@/shared/ui/conditional-filter"

import "./notion-tasks.css"

import { TaskBoard } from "./task-board"
import { TaskCreateModal } from "./task-create-modal"
import { TaskDetailModal } from "./task-detail-modal"
import { TaskTable } from "./task-table"
import { TaskCalendar } from "./task-calendar"

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, "")
}

interface TaskBoardViewProps {
  conversationId: number | null
  isGroup: boolean
  conversationMembers: Array<{
    userId: number
    displayName: string
    avatar: string | null
  }>
  currentUserId: number
  requestedTaskId?: number | null
  onClearRequestedTaskId?: () => void
}

export function TaskBoardView({
  conversationId,
  isGroup,
  conversationMembers,
  currentUserId,
  requestedTaskId,
  onClearRequestedTaskId,
}: TaskBoardViewProps) {
  const { t } = useTranslation()

  // State
  const [viewMode, setViewMode] = React.useState<"board" | "table" | "calendar">("board")
  const [taskScope, setTaskScope] = React.useState<"group" | "personal">(() =>
    isGroup && conversationId ? "group" : "personal"
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [prefilledDueDate, setPrefilledDueDate] = React.useState<string | null>(null)
  const [prefilledStatusKey, setPrefilledStatusKey] = React.useState<string | null>(null)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)

  // Sync taskScope when changing conversations
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTaskScope(isGroup && conversationId ? "group" : "personal")
    setSearchQuery("")
    setSelectedTask(null)
  }, [conversationId, isGroup])

  // Queries & Mutations
  const activeQueryConversationId = taskScope === "group" ? conversationId : null
  const { data: tasks = [], isLoading } = useTasks(activeQueryConversationId)
  const { data: statuses = [] } = useTaskStatuses(activeQueryConversationId)
  const updateTaskMutation = useUpdateTask()

  const createStatusMutation = useCreateTaskStatus()
  const updateStatusMutation = useUpdateTaskStatus()
  const deleteStatusMutation = useDeleteTaskStatus()

  // Filter fields config
  const filterFields = React.useMemo(() => {
    return [
      {
        name: "status",
        label: t("tasks.status", "Trạng thái"),
        type: "select" as const,
        options: statuses.length > 0
          ? statuses.map((s) => ({ label: s.name, value: s.key }))
          : [
              { label: t("tasks.statusTodo", "Cần làm"), value: "todo" },
              { label: t("tasks.statusInProgress", "Đang làm"), value: "in_progress" },
              { label: t("tasks.statusCompleted", "Hoàn thành"), value: "completed" },
            ],
      },
      {
        name: "priority",
        label: t("tasks.priority", "Độ ưu tiên"),
        type: "select" as const,
        options: [
          { label: t("tasks.priorityLow", "Thấp"), value: "low" },
          { label: t("tasks.priorityMedium", "Trung bình"), value: "medium" },
          { label: t("tasks.priorityHigh", "Cao"), value: "high" },
        ],
      },
      {
        name: "dueDate",
        label: t("tasks.dueDate", "Hạn chót"),
        type: "date" as const,
      },
      {
        name: "assignedToId",
        label: t("tasks.assignee", "Người thực hiện"),
        type: "select" as const,
        options: conversationMembers.map((m) => ({
          label: m.displayName,
          value: m.userId.toString(),
        })),
      },
    ]
  }, [conversationMembers, t, statuses])

  const filterConfig = React.useMemo(() => ({
    fields: filterFields,
    allowConjunctionToggle: false,
    maxRows: 5,
    paramStyle: "underscore" as const,
    searchParamName: "search",
  }), [filterFields])

  React.useEffect(() => {
    if (!requestedTaskId) return

    // 1. Check if the task is already in the current list
    const found = tasks.find((t) => t.id === requestedTaskId)
    if (found) {
      setSelectedTask(found)
      setTaskScope("group")
      onClearRequestedTaskId?.()
      return
    }

    // 2. Otherwise, fetch it directly from the API
    let active = true
    taskApi
      .getById(requestedTaskId)
      .then((res) => {
        if (!active) return
        const taskData = res.data?.data
        if (taskData) {
          setSelectedTask(taskData)
          setTaskScope("group")
        } else {
          toast.error(
            t(
              "tasks.notFoundOrNoAccess",
              "Công việc không tồn tại hoặc bạn không có quyền truy cập"
            )
          )
        }
      })
      .catch((err) => {
        if (!active) return
        console.error(err)
        toast.error(
          t(
            "tasks.notFoundOrNoAccess",
            "Công việc không tồn tại hoặc bạn không có quyền truy cập"
          )
        )
      })
      .finally(() => {
        if (active) {
          onClearRequestedTaskId?.()
        }
      })

    return () => {
      active = false
    }
  }, [requestedTaskId, tasks, onClearRequestedTaskId, t])

  // Filter tasks by search query
  const filteredTasks = React.useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    if (!trimmed) return tasks
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(trimmed) ||
        (task.description && stripHtml(task.description).toLowerCase().includes(trimmed))
    )
  }, [tasks, searchQuery])

  // Reactive task mapping for modal updates
  const activeTask = React.useMemo(() => {
    if (!selectedTask) return null
    return tasks.find((t) => t.id === selectedTask.id) ?? selectedTask
  }, [tasks, selectedTask])

  const handleUpdateTaskStatusAndPosition = async (
    taskId: number,
    status: "todo" | "in_progress" | "completed",
    position?: number
  ) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      const isOwner = task.createdById === currentUserId
      const isAssignee = task.assignedToId === currentUserId
      const member = task.members?.find((m) => m.userId === currentUserId)
      const hasMemberPermission = member && (member.role === "owner" || member.role === "assignee")

      if (!isOwner && !isAssignee && !hasMemberPermission) {
        toast.error(t("tasks.noPermission", "Bạn không có quyền thực hiện thao tác này"))
        return
      }
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        payload: {
          status,
          ...(position !== undefined ? { position } : {}),
        },
      })
      toast.success(t("tasks.statusUpdated", "Đã cập nhật trạng thái"))
    } catch (err) {
      console.error(err)
      toast.error(t("tasks.updateError", "Không thể cập nhật trạng thái"))
    }
  }

  const handleUpdateTaskDueDate = async (taskId: number, dueDate: string | null) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      const isOwner = task.createdById === currentUserId
      const member = task.members?.find((m) => m.userId === currentUserId)
      const hasOwnerPermission = member && member.role === "owner"

      if (!isOwner && !hasOwnerPermission) {
        toast.error(t("tasks.noPermission", "Bạn không có quyền thực hiện thao tác này"))
        return
      }
    }

    try {
      await updateTaskMutation.mutateAsync({ taskId, payload: { dueDate } })
      toast.success(t("tasks.dueDateUpdated", "Đã cập nhật hạn chót"))
    } catch (err) {
      console.error(err)
      toast.error(t("tasks.updateError", "Không thể cập nhật hạn chót"))
    }
  }

  return (
    <FilterProvider config={filterConfig}>
      <div className="notion-root flex h-full min-h-0 w-full flex-col bg-[var(--notion-bg)]">
        {/* Notion-style Toolbar */}
        <div className="notion-toolbar flex flex-col gap-3 border-b border-[var(--notion-border)] bg-[var(--notion-surface)] p-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          {/* Left: Scope + View Toggle */}
          <div className="flex items-center gap-2">
            {/* Scope Toggle */}
            {isGroup && conversationId && (
              <div className="notion-tabs">
                <button
                  type="button"
                  onClick={() => setTaskScope("group")}
                  className={cn(
                    "notion-tab",
                    taskScope === "group" ? "notion-tab--active" : "notion-tab--inactive"
                  )}
                >
                  {t("tasks.scopeGroup", "Nhóm")}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskScope("personal")}
                  className={cn(
                    "notion-tab",
                    taskScope === "personal" ? "notion-tab--active" : "notion-tab--inactive"
                  )}
                >
                  {t("tasks.scopePersonal", "Của tôi")}
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="notion-tabs">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn(
                  "notion-tab",
                  viewMode === "board" ? "notion-tab--active" : "notion-tab--inactive"
                )}
                title={t("tasks.viewBoard", "Bảng Kanban")}
              >
                <LayoutGridIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "notion-tab",
                  viewMode === "table" ? "notion-tab--active" : "notion-tab--inactive"
                )}
                title={t("tasks.viewTable", "Dạng bảng")}
              >
                <ListIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "notion-tab",
                  viewMode === "calendar" ? "notion-tab--active" : "notion-tab--inactive"
                )}
                title={t("tasks.viewCalendar", "Dạng lịch")}
              >
                <CalendarIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Right: Search + Filter + New */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="notion-search-wrapper">
              <SearchIcon className="notion-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("tasks.searchPlaceholder", "Tìm kiếm...")}
                className="notion-search-input"
              />
            </div>

            {/* Filter button (table view only) */}
            {viewMode === "table" && <FilterRoot />}

            {/* New Task Button */}
            <Button
              type="button"
              onClick={() => {
                setPrefilledDueDate(null)
                setCreateModalOpen(true)
              }}
              className="notion-btn-primary h-8 px-3 text-xs gap-1.5"
            >
              <PlusIcon className="size-4" />
              {t("tasks.newTask", "Mới")}
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="notion-content min-h-0 flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="notion-loading">
              <Loader2Icon className="size-6 animate-spin text-[var(--notion-text-tertiary)]" />
            </div>
          ) : viewMode === "board" ? (
            <TaskBoard
              tasks={filteredTasks}
              statuses={statuses}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatusAndPosition}
              onAddTask={(statusKey) => {
                setPrefilledDueDate(null)
                setPrefilledStatusKey(statusKey)
                setCreateModalOpen(true)
              }}
              onCreateStatus={async (name, color) => {
                if (activeQueryConversationId) {
                  await createStatusMutation.mutateAsync({
                    conversationId: activeQueryConversationId,
                    payload: { name, color }
                  })
                }
              }}
              onUpdateStatus={async (statusId, payload) => {
                if (activeQueryConversationId) {
                  await updateStatusMutation.mutateAsync({
                    conversationId: activeQueryConversationId,
                    statusId,
                    payload
                  })
                }
              }}
              onDeleteStatus={async (statusId) => {
                if (activeQueryConversationId) {
                  await deleteStatusMutation.mutateAsync({
                    conversationId: activeQueryConversationId,
                    statusId
                  })
                }
              }}
            />
          ) : viewMode === "table" ? (
            <TaskTable
              conversationId={activeQueryConversationId}
              searchQuery={searchQuery}
              onSelectTask={setSelectedTask}
              onUpdateTaskStatus={handleUpdateTaskStatusAndPosition}
            />
          ) : (
            <div className="h-full w-full overflow-auto">
              <TaskCalendar
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
                onAddTask={(dueDateStr) => {
                  setPrefilledDueDate(dueDateStr)
                  setPrefilledStatusKey(null)
                  setCreateModalOpen(true)
                }}
                onUpdateTaskDueDate={handleUpdateTaskDueDate}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        <TaskCreateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          conversationId={activeQueryConversationId}
          members={conversationMembers}
          currentUserId={currentUserId}
          initialDueDate={prefilledDueDate}
          initialStatusKey={prefilledStatusKey}
          statuses={statuses}
        />

        <TaskDetailModal
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={activeTask}
          members={conversationMembers}
          currentUserId={currentUserId}
          statuses={statuses}
        />
      </div>
    </FilterProvider>
  )
}