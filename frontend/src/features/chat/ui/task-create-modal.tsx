import * as React from "react"
import { LoaderIcon, UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useCreateTask } from "@/shared/api"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"
import { DatePicker } from "@/shared/ui/date-picker"

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

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = React.useState("")
  const [assignedToId, setAssignedToId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (open) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setDueDate("")
      setAssignedToId(null)
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
      await createTaskMutation.mutateAsync({
        title: trimmed,
        description: description.trim() || undefined,
        conversationId: conversationId ?? undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedToId: assignedToId ?? undefined,
      })
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

          {/* Assignee */}
          <div className="notion-field">
            <label className="notion-label flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {t("tasks.assignTo", "Người thực hiện")}
            </label>
            <select
              value={assignedToId ?? ""}
              onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : null)}
              className="notion-select"
              disabled={createTaskMutation.isPending}
            >
              <option value="">{t("tasks.unassigned", "Chưa giao")}</option>
              {conversationId ? (
                members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.displayName}</option>
                ))
              ) : (
                <option value={currentUserId}>{t("tasks.assignToMe", "Giao cho tôi")}</option>
              )}
            </select>
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