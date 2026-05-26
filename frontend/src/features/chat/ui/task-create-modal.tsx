import * as React from "react"
import { LoaderIcon, UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useCreateTask, useAddTaskMember } from "@/shared/api"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
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
}

export function TaskCreateModal({ open, onOpenChange, conversationId, members, currentUserId }: TaskCreateModalProps) {
  const { t } = useTranslation()
  const createTaskMutation = useCreateTask()
  const addTaskMemberMutation = useAddTaskMember()

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = React.useState("")
  const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([])
  const [estimatedValue, setEstimatedValue] = React.useState("")
  const [estimatedUnit, setEstimatedUnit] = React.useState<"minutes" | "hours" | "days">("hours")
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setDueDate("")
      setSelectedUserIds([])
      setEstimatedValue("")
      setEstimatedUnit("hours")
      setAssigneeDropdownOpen(false)
    }
  }, [open])

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
      })

      // Add extra selected assignees using task members API
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
      <AlertDialogContent className="notion-modal w-[min(32rem,calc(100vw-2rem))] max-w-lg gap-0 rounded-xl border border-[var(--notion-border)] bg-[var(--notion-popover)] p-0 shadow-xl overflow-hidden">
        <AlertDialogHeader className="notion-modal-header px-6 pt-6 pb-4 border-b border-[var(--notion-border)]">
          <AlertDialogTitle className="text-base font-semibold text-[var(--notion-text)]">
            {t("tasks.createNewTask", "Tạo công việc mới")}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-5 px-6 py-5">
          {/* Title */}
          <div className="notion-field">
            <label className="notion-label">
              {t("tasks.title", "Tiêu đề")} <span className="text-[var(--notion-red)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tasks.titlePlaceholder", "Nhập tiêu đề...")}
              className="notion-input"
              disabled={createTaskMutation.isPending}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="notion-field">
            <label className="notion-label">{t("tasks.description", "Mô tả")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tasks.descriptionPlaceholder", "Thêm mô tả...")}
              className="notion-textarea min-h-[80px]"
              disabled={createTaskMutation.isPending}
            />
          </div>

          {/* Priority + Due Date grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="notion-field">
              <label className="notion-label">{t("tasks.priority", "Mức ưu tiên")}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="notion-select"
                disabled={createTaskMutation.isPending}
              >
                <option value="low">{t("tasks.priorityLow", "Thấp")}</option>
                <option value="medium">{t("tasks.priorityMedium", "Trung bình")}</option>
                <option value="high">{t("tasks.priorityHigh", "Cao")}</option>
              </select>
            </div>

            <div className="notion-field">
              <label className="notion-label">{t("tasks.dueDate", "Hạn chót")}</label>
              <DatePicker
                value={dueDate}
                onChange={(date) => setDueDate(date ?? "")}
                disabled={createTaskMutation.isPending}
              />
            </div>
          </div>

          {/* Assignee + Estimated Hours grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="notion-field">
              <label className="notion-label flex items-center gap-1">
                <UserIcon className="size-3.5" />
                {t("tasks.assignTo", "Người thực hiện")}
              </label>
              <Popover open={assigneeDropdownOpen} onOpenChange={setAssigneeDropdownOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="notion-input flex items-center justify-between text-left h-auto min-h-[36px] py-1.5 px-3 w-full"
                    disabled={createTaskMutation.isPending}
                  >
                    {selectedUserIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedUserIds.map((userId) => {
                          const member = members.find((m) => m.userId === userId)
                          if (!member) return null
                          return (
                            <span
                              key={userId}
                              className="inline-flex items-center gap-1 bg-[var(--notion-muted)] text-xs text-[var(--notion-text)] px-2 py-0.5 rounded-full border border-[var(--notion-border)]"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUserIds((prev) => prev.filter((id) => id !== userId))
                              }}
                            >
                              <span>{member.displayName}</span>
                              <span className="text-[10px] text-[var(--notion-text-secondary)] font-bold hover:text-[var(--notion-red)] ml-0.5">×</span>
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-[var(--notion-text-tertiary)]">{t("tasks.unassigned", "Chưa giao")}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={4} className="p-0 bg-transparent border-none shadow-none ring-0 w-[var(--radix-popover-trigger-width)]">
                  <div className="max-h-[200px] overflow-auto rounded-md border border-[var(--notion-border)] bg-[var(--notion-popover)] py-1 shadow-lg w-full">
                    {conversationId ? (
                      members.map((m) => {
                        const isSelected = selectedUserIds.includes(m.userId)
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== m.userId))
                              } else {
                                setSelectedUserIds((prev) => [...prev, m.userId])
                              }
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={m.avatar ?? undefined} />
                                <AvatarFallback className="text-[9px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
                                  {m.displayName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{m.displayName}</span>
                            </div>
                            {isSelected && <span className="text-[var(--notion-accent)] text-xs font-bold">✓</span>}
                          </button>
                        )
                      })
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const isSelected = selectedUserIds.includes(currentUserId)
                          if (isSelected) {
                            setSelectedUserIds([])
                          } else {
                            setSelectedUserIds([currentUserId])
                          }
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                      >
                        <span>{t("tasks.assignToMe", "Giao cho tôi")}</span>
                        {selectedUserIds.includes(currentUserId) && <span className="text-[var(--notion-accent)] text-xs font-bold">✓</span>}
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="notion-field">
              <label className="notion-label">{t("tasks.estimatedTime", "Thời gian ước tính")}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder={t("tasks.estimatePlaceholder", "Ví dụ: 8")}
                  className="notion-input flex-1"
                  disabled={createTaskMutation.isPending}
                />
                <select
                  value={estimatedUnit}
                  onChange={(e) => setEstimatedUnit(e.target.value as "minutes" | "hours" | "days")}
                  className="notion-select w-24"
                  disabled={createTaskMutation.isPending}
                >
                  <option value="minutes">{t("tasks.minutes", "phút")}</option>
                  <option value="hours">{t("tasks.hours", "giờ")}</option>
                  <option value="days">{t("tasks.days", "ngày")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
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
              className="notion-btn-primary min-w-[100px] px-4"
            >
              {createTaskMutation.isPending && <LoaderIcon className="size-4 animate-spin mr-1.5" />}
              {createTaskMutation.isPending ? t("tasks.creating", "Đang tạo...") : t("tasks.create", "Tạo")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}