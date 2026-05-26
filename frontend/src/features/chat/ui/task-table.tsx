import * as React from "react"
import { ArrowUpDown, CalendarIcon, Loader2Icon, MoreHorizontal, TrashIcon, UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { Task } from "@/shared/api"
import { useDeleteTask, useInfiniteTasks } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { formatEstimate } from "@/shared/lib/time-estimate-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { buildRestQuery, useFilterContext } from "@/shared/ui/conditional-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, "")
}

interface TaskTableProps {
  conversationId: number | null
  searchQuery: string
  onSelectTask: (task: Task) => void
  onUpdateTaskStatus: (taskId: number, status: "todo" | "in_progress" | "completed") => void
}

type SortField = "dueDate" | "priority" | "status" | "title"
type SortOrder = "asc" | "desc"

const priorityWeight = (p: string) => ({ high: 3, medium: 2, low: 1 }[p] ?? 0)
const statusWeight = (s: string) => ({ completed: 3, in_progress: 2, todo: 1 }[s] ?? 0)

export function TaskTable({ conversationId, searchQuery, onSelectTask, onUpdateTaskStatus }: TaskTableProps) {
  const { t } = useTranslation()
  const deleteTaskMutation = useDeleteTask()
  const [sortField, setSortField] = React.useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc")
  const observerTarget = React.useRef<HTMLDivElement>(null)
  const { state, config } = useFilterContext()

  const queryParams = React.useMemo(() => buildRestQuery(state.rows, config), [state.rows, config])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteTasks(
    conversationId,
    15,
    searchQuery,
    queryParams
  )

  const tasks = React.useMemo(() => data?.pages.flat() ?? [], [data])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((p) => (p === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const sortedTasks = React.useMemo(() => {
    if (!sortField) return tasks
    return [...tasks].sort((a, b) => {
      let c = 0
      if (sortField === "title") c = a.title.localeCompare(b.title)
      else if (sortField === "priority") c = priorityWeight(a.priority) - priorityWeight(b.priority)
      else if (sortField === "status") c = statusWeight(a.status) - statusWeight(b.status)
      else if (sortField === "dueDate") {
        if (!a.dueDate && !b.dueDate) c = 0
        else if (!a.dueDate) c = 1
        else if (!b.dueDate) c = -1
        else c = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      return sortOrder === "asc" ? c : -c
    })
  }, [tasks, sortField, sortOrder])

  // Infinite scroll
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) void fetchNextPage() },
      { threshold: 0.1 }
    )
    const cur = observerTarget.current
    if (cur) observer.observe(cur)
    return () => { if (cur) observer.unobserve(cur) }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDeleteTask = async (taskId: number, conversationId: number | null) => {
    try {
      await deleteTaskMutation.mutateAsync({ taskId, conversationId })
      toast.success(t("tasks.deleted", "Đã xóa công việc"))
    } catch {
      toast.error(t("tasks.deleteError", "Không thể xóa công việc"))
    }
  }

  const isOverdue = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr || status === "completed") return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dueDateStr) < today
  }

  const colHeader = (field: SortField, label: string) => (
    <button
      onClick={() => handleSort(field)}
      className="notion-sort-btn -ml-2"
    >
      <span>{label}</span>
      <ArrowUpDown className={cn("notion-sort-icon", sortField === field && "text-[var(--notion-accent)]")} />
    </button>
  )

  if (isLoading) {
    return (
      <div className="notion-loading">
        <Loader2Icon className="size-6 animate-spin text-[var(--notion-text-tertiary)]" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="notion-empty-page flex h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--notion-border)] p-8 text-center bg-[var(--notion-card)]">
        <div className="rounded-full bg-[var(--notion-muted)] p-3 mb-4">
          <CalendarIcon className="size-6 text-[var(--notion-text-tertiary)]" />
        </div>
        <h4 className="text-sm font-medium text-[var(--notion-text)]">{t("tasks.noTasks", "Không có công việc nào")}</h4>
        <p className="text-xs text-[var(--notion-text-secondary)] mt-1">{t("tasks.noTasksSub", "Tạo công việc mới để bắt đầu.")}</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto p-0 select-none">
      <div className="w-full min-w-[850px] overflow-hidden">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="notion-table-header">
            <tr>
              <th>{colHeader("title", t("tasks.title", "Tiêu đề"))}</th>
              <th className="w-[130px]">{colHeader("status", t("tasks.status", "Trạng thái"))}</th>
              <th className="w-[150px]">{t("tasks.assignee", "Người thực hiện")}</th>
              <th className="w-[120px]">{colHeader("priority", t("tasks.priority", "Ưu tiên"))}</th>
              <th className="w-[130px]">{colHeader("dueDate", t("tasks.dueDate", "Hạn chót"))}</th>
              <th className="w-[100px]">{t("tasks.estimatedTime", "Thời gian")}</th>
              <th className="w-[150px]">{t("tasks.tags", "Nhãn")}</th>
              <th className="w-[110px]">{t("tasks.progress", "Tiến độ")}</th>
              <th className="w-[50px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--notion-border)]">
            {sortedTasks.map((task) => {
              const total = task.subtasks?.length ?? 0
              const done = task.subtasks?.filter((s) => s.isCompleted).length ?? 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              const overdue = isOverdue(task.dueDate, task.status)

              const statusDot: Record<string, string> = {
                todo: "var(--notion-gray)",
                in_progress: "var(--notion-orange)",
                completed: "var(--notion-green)",
              }

              const priorityDot: Record<string, string> = {
                high: "var(--notion-red)",
                medium: "var(--notion-orange)",
                low: "var(--notion-blue)",
              }

              const assignees = task.members?.filter((m) => m.role === "assignee") || []

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="notion-table-row"
                >
                  {/* Title */}
                  <td className="max-w-[260px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-[var(--notion-text)] text-[13px] truncate block">{task.title}</span>
                      {task.description && (
                        <span className="text-xs text-[var(--notion-text-secondary)] truncate block">{stripHtml(task.description)}</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="notion-status-btn">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: statusDot[task.status] }} />
                          <span>{task.status === "todo" ? "Cần làm" : task.status === "in_progress" ? "Đang làm" : "Hoàn thành"}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="notion-dropdown w-36">
                        <DropdownMenuLabel>{t("tasks.status", "Trạng thái")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(["todo", "in_progress", "completed"] as const).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => onUpdateTaskStatus(task.id, s)}>
                            <span className="size-2 rounded-full mr-2" style={{ backgroundColor: statusDot[s] }} />
                            {s === "todo" ? "Cần làm" : s === "in_progress" ? "Đang làm" : "Hoàn thành"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Assignee */}
                  <td>
                    {assignees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="notion-avatar-stack">
                          {assignees.slice(0, 3).map((member) => (
                            <Avatar key={member.id} className="h-5 w-5 notion-avatar-stack__item" title={member.user.displayName}>
                              <AvatarImage src={member.user.avatar ?? undefined} />
                              <AvatarFallback className="text-[9px] font-semibold bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
                                {member.user.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {assignees.length > 3 && (
                            <div className="notion-avatar-stack__overflow" title={`${assignees.length - 3} người khác`}>
                              +{assignees.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[var(--notion-text)] truncate max-w-[100px]" title={assignees.map(m => m.user.displayName).join(", ")}>
                          {assignees.map(m => m.user.displayName).join(", ")}
                        </span>
                      </div>
                    ) : task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 shadow-xs ring-1 ring-[var(--notion-border)]">
                          <AvatarImage src={task.assignee.avatar ?? undefined} />
                          <AvatarFallback className="text-[9px] font-semibold bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
                            {task.assignee.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-[var(--notion-text)] truncate max-w-[100px]">{task.assignee.displayName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[var(--notion-text-tertiary)] text-[11px] italic">
                        <UserIcon className="size-3.5" />
                        <span>{t("tasks.unassigned", "Chưa giao")}</span>
                      </div>
                    )}
                  </td>

                  {/* Priority */}
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: priorityDot[task.priority] }} />
                      <span className="text-xs font-medium text-[var(--notion-text-secondary)]">
                        {task.priority === "high" ? "Cao" : task.priority === "medium" ? "Trung bình" : "Thấp"}
                      </span>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td>
                    {task.dueDate ? (
                      <div className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5",
                        overdue
                          ? "bg-[var(--notion-red)]/10 text-[var(--notion-red)]"
                          : "text-[var(--notion-text-secondary)]"
                      )}>
                        <CalendarIcon className="size-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--notion-text-tertiary)]">—</span>
                    )}
                  </td>

                  {/* Estimated Time */}
                  <td>
                    {task.estimatedValue !== null && task.estimatedValue !== undefined ? (
                      <span className="text-xs font-medium text-[var(--notion-text-secondary)]">
                        {formatEstimate(task.estimatedValue, task.estimatedUnit)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--notion-text-tertiary)]">—</span>
                    )}
                  </td>

                  {/* Tags */}
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[140px]">
                      {task.tags?.map((taskTag) => (
                        <span
                          key={taskTag.tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${taskTag.tag.color}15`,
                            color: taskTag.tag.color,
                            border: `1px solid ${taskTag.tag.color}30`
                          }}
                        >
                          {taskTag.tag.name}
                        </span>
                      ))}
                      {(!task.tags || task.tags.length === 0) && (
                        <span className="text-xs text-[var(--notion-text-tertiary)]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Progress */}
                  <td>
                    {total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-14 rounded-full bg-[var(--notion-muted)] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-[var(--notion-green)]" : "bg-[var(--notion-accent)]")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--notion-text-tertiary)]">{done}/{total}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--notion-text-tertiary)]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="notion-icon-btn">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="notion-dropdown w-36">
                        <DropdownMenuLabel>{t("tasks.actions", "Thao tác")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectTask(task)}>{t("tasks.viewDetails", "Xem chi tiết")}</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteTask(task.id, task.conversationId)}>
                          <TrashIcon className="size-3.5 mr-2" />
                          {t("tasks.delete", "Xóa")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}

            {/* Infinite scroll sentinel */}
            {hasNextPage && (
              <tr>
                <td colSpan={9} className="p-0 border-none">
                  <div ref={observerTarget} className="w-full flex items-center justify-center py-4">
                    <Loader2Icon className="size-4 animate-spin text-[var(--notion-text-tertiary)]" />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}