import * as React from "react"
import { CalendarIcon, CheckSquareIcon, ClockIcon, LoaderIcon, PlusIcon, UserIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useCreateTask, useAddTaskMember } from "@/shared/api"
import type { TaskStatus } from "@/shared/api"
import {
  AlertDialog,
  AlertDialogContent,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"
import { DatePicker } from "@/shared/ui/date-picker"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: number | null
  members: Array<{ userId: number; displayName: string; avatar: string | null }>
  currentUserId: number
  initialDueDate?: string | null
  initialStatusKey?: string | null
  statuses?: TaskStatus[]
}

export function TaskCreateModal({ open, onOpenChange, conversationId, members, currentUserId, initialDueDate, initialStatusKey, statuses }: TaskCreateModalProps) {
  const { t } = useTranslation()
  const createTaskMutation = useCreateTask()
  const addTaskMemberMutation = useAddTaskMember()

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = React.useState("")
  const [statusKey, setStatusKey] = React.useState("todo")
  const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([])
  const [estimatedValue, setEstimatedValue] = React.useState("")
  const [estimatedUnit, setEstimatedUnit] = React.useState<"minutes" | "hours" | "days">("hours")
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = React.useState(false)

  const statusesList = React.useMemo(() => {
    if (statuses && statuses.length > 0) return statuses
    return [
      { key: "todo", name: t("tasks.statusTodo", "Cần làm") },
      { key: "in_progress", name: t("tasks.statusInProgress", "Đang làm") },
      { key: "completed", name: t("tasks.statusCompleted", "Hoàn thành") }
    ]
  }, [statuses, t])

  React.useEffect(() => {
    if (open) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setDueDate(initialDueDate || "")
      setSelectedUserIds([])
      setEstimatedValue("")
      setEstimatedUnit("hours")
      setAssigneeDropdownOpen(false)
      setStatusKey(initialStatusKey || (statusesList[0]?.key ?? "todo"))
    }
  }, [open, initialDueDate, initialStatusKey, statusesList])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      toast.error(t("tasks.titleRequired", "Tiêu đề bắt buộc"))
      return
    }
    try {
      const task = await createTaskMutation.mutateAsync({
        title: trimmed,
        description: description.trim() || undefined,
        conversationId: conversationId ?? undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedToId: selectedUserIds[0] ?? null,
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
        estimatedUnit: estimatedValue ? estimatedUnit : null,
        status: statusKey,
      })

      const extraAssignees = selectedUserIds.filter(
        (userId) => userId !== selectedUserIds[0] && userId !== currentUserId
      )

      if (extraAssignees.length > 0) {
        await Promise.all(
          extraAssignees.map((userId) =>
            addTaskMemberMutation.mutateAsync({
              taskId: task.id,
              userId,
              role: "assignee",
            })
          )
        )
      }

      toast.success(t("tasks.createSuccess", "Tạo công việc thành công"))
      onOpenChange(false)
    } catch {
      toast.error(t("tasks.createError", "Không thể tạo công việc"))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="notion-modal w-[min(52rem,calc(100vw-2rem))] max-w-4xl gap-0 rounded-xl border border-[var(--notion-border)] bg-[var(--notion-popover)] p-0 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[75vh] max-h-[700px]">
        <form onSubmit={handleCreate} className="flex flex-col flex-1 md:flex-row min-h-0">
        {/* LEFT: Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--notion-text-tertiary)]">
              {t("tasks.newTask", "New Task")}
            </span>
            <div className="flex items-center gap-1">
              {createTaskMutation.isPending && (
                <LoaderIcon className="size-4 animate-spin text-[var(--notion-text-tertiary)]" />
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="notion-icon-btn"
                disabled={createTaskMutation.isPending}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Title - Notion page style */}
          <div className="px-6 pb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tasks.titlePlaceholder", "Task title...")}
              className="w-full text-xl font-semibold text-[var(--notion-text)] bg-transparent border-none outline-none placeholder:text-[var(--notion-text-tertiary)]"
              disabled={createTaskMutation.isPending}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="px-6 pb-4 flex-1 overflow-y-auto">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tasks.descriptionPlaceholder", "Add description...")}
              className="w-full min-h-[120px] text-sm text-[var(--notion-text)] bg-transparent border-none outline-none resize-none placeholder:text-[var(--notion-text-tertiary)] leading-relaxed"
              disabled={createTaskMutation.isPending}
            />
          </div>
        </div>

        {/* RIGHT: Properties sidebar */}
        <div className="w-full md:w-72 bg-[var(--notion-popover)] border-l border-[var(--notion-border)] flex flex-col shrink-0">
          <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1">
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--notion-text-tertiary)]">
              {t("tasks.properties", "Properties")}
            </span>

            <div className="notion-property-grid">
              {/* Status */}
              <div className="notion-property-row">
                <span className="notion-property-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--notion-text-tertiary)] mr-1.5" />
                  {t("tasks.status", "Trạng thái")}
                </span>
                <div className="notion-property-value">
                  <select
                    value={statusKey}
                    onChange={(e) => setStatusKey(e.target.value)}
                    className="notion-property-select"
                    disabled={createTaskMutation.isPending}
                  >
                    {statusesList.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div className="notion-property-row">
                <span className="notion-property-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--notion-red)] mr-1.5" />
                  {t("tasks.priority", "Priority")}
                </span>
                <div className="notion-property-value">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                    className="notion-property-select"
                    disabled={createTaskMutation.isPending}
                  >
                    <option value="low">{t("tasks.priorityLow", "Low")}</option>
                    <option value="medium">{t("tasks.priorityMedium", "Medium")}</option>
                    <option value="high">{t("tasks.priorityHigh", "High")}</option>
                  </select>
                </div>
              </div>

              {/* Assignee */}
              <div className="notion-property-row">
                <span className="notion-property-label">
                  <UserIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                  {t("tasks.assignee", "Assignee")}
                </span>
                <div className="notion-property-value flex flex-wrap gap-1 items-center">
                  {selectedUserIds.map((userId) => {
                    const member = members.find((m) => m.userId === userId)
                    if (!member) return null
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-1 bg-[var(--notion-muted)] pl-0.5 pr-1 py-0.5 rounded text-[11px] border border-[var(--notion-border)]"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={member.avatar ?? undefined} />
                          <AvatarFallback className="text-[8px] bg-[var(--notion-card)] text-[var(--notion-text-secondary)]">
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[60px] text-[var(--notion-text)] font-medium">{member.displayName}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== userId))}
                          className="text-[var(--notion-text-tertiary)] hover:text-[var(--notion-red)] font-bold text-[10px] ml-0.5"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}

                  <Popover open={assigneeDropdownOpen} onOpenChange={setAssigneeDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border border-dashed border-[var(--notion-border)] hover:bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]"
                        disabled={createTaskMutation.isPending}
                      >
                        <PlusIcon className="size-2.5" />
                        <span>{t("tasks.add", "Add")}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" sideOffset={4} className="p-0 bg-transparent border-none shadow-none ring-0 w-44">
                      <div className="max-h-[160px] w-44 overflow-y-auto rounded-md border border-[var(--notion-border)] bg-[var(--notion-popover)] py-1 shadow-lg">
                        {conversationId ? (
                          members
                            .filter((m) => m.userId !== currentUserId && !selectedUserIds.includes(m.userId))
                            .map((m) => (
                              <button
                                key={m.userId}
                                type="button"
                                onClick={() => {
                                  setSelectedUserIds((prev) => [...prev, m.userId])
                                  setAssigneeDropdownOpen(false)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                              >
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={m.avatar ?? undefined} />
                                  <AvatarFallback className="text-[8px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
                                    {m.displayName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{m.displayName}</span>
                              </button>
                            ))
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserIds([currentUserId])
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                          >
                            <span>{t("tasks.assignToMe", "Assign to me")}</span>
                          </button>
                        )}
                        {conversationId && members.filter((m) => m.userId !== currentUserId && !selectedUserIds.includes(m.userId)).length === 0 && (
                          <div className="px-3 py-2 text-center text-[10px] text-[var(--notion-text-tertiary)] italic">
                            {t("tasks.allAssigned", "Đã gán cho tất cả")}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Due Date */}
              <div className="notion-property-row">
                <span className="notion-property-label">
                  <CalendarIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                  {t("tasks.dueDate", "Due date")}
                </span>
                <div className="notion-property-value">
                  <DatePicker
                    value={dueDate}
                    onChange={(date) => setDueDate(date ?? "")}
                    disabled={createTaskMutation.isPending}
                    className="h-8 text-xs !border-transparent !bg-transparent hover:!bg-[var(--notion-muted)] px-1.5 focus:!border-[var(--notion-border)] focus:!ring-0 shadow-none"
                  />
                </div>
              </div>

              {/* Estimated Time */}
              <div className="notion-property-row">
                <span className="notion-property-label">
                  <ClockIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                  {t("tasks.estimate", "Estimate")}
                </span>
                <div className="notion-property-value">
                  <div className="flex gap-1 items-center w-full">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      placeholder="—"
                      className="notion-property-input w-14 text-center"
                      disabled={createTaskMutation.isPending}
                    />
                    <select
                      value={estimatedUnit}
                      onChange={(e) => setEstimatedUnit(e.target.value as "minutes" | "hours" | "days")}
                      className="notion-property-select flex-1 min-w-[72px]"
                      disabled={createTaskMutation.isPending}
                    >
                      <option value="minutes">{t("tasks.minutes", "min")}</option>
                      <option value="hours">{t("tasks.hours", "hr")}</option>
                      <option value="days">{t("tasks.days", "day")}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-[var(--notion-border)] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTaskMutation.isPending}
              className="notion-btn-secondary px-4"
            >
              {t("tasks.cancel", "Hủy")}
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending || !title.trim()}
              className="notion-btn-primary min-w-[80px] px-4"
            >
              {createTaskMutation.isPending ? t("tasks.creating", "Đang tạo...") : t("tasks.create", "Tạo")}
            </Button>
          </div>
        </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}