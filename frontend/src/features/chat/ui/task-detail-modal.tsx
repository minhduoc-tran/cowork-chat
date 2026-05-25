import * as React from "react"
import { AlertCircleIcon, CalendarIcon, CheckSquareIcon, FileTextIcon, LoaderIcon, PlusIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { cn } from "@/shared/lib/utils"
import type { Task } from "@/shared/api"
import { useCreateSubtask, useDeleteSubtask, useDeleteTask, useUpdateSubtask, useUpdateTask } from "@/shared/api"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import { DatePicker } from "@/shared/ui/date-picker"

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  members: Array<{ userId: number; displayName: string; avatar: string | null }>
  currentUserId: number
}

const priorityLabel = (p: string, t: ReturnType<typeof useTranslation>["t"]) =>
  ({ high: t("tasks.priorityHigh", "Cao"), medium: t("tasks.priorityMedium", "Trung bình"), low: t("tasks.priorityLow", "Thấp") }[p] ?? p)
const statusLabel = (s: string, t: ReturnType<typeof useTranslation>["t"]) =>
  ({ todo: t("tasks.statusTodo", "Cần làm"), in_progress: t("tasks.statusInProgress", "Đang làm"), completed: t("tasks.statusCompleted", "Hoàn thành") }[s] ?? s)

export function TaskDetailModal({ open, onOpenChange, task, members, currentUserId }: TaskDetailModalProps) {
  const { t } = useTranslation()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const createSubtaskMutation = useCreateSubtask()
  const updateSubtaskMutation = useUpdateSubtask()
  const deleteSubtaskMutation = useDeleteSubtask()

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [isEditingDesc, setIsEditingDesc] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setIsEditingTitle(false)
      setIsEditingDesc(false)
      setNewSubtaskTitle("")
    }
  }, [task])

  if (!task) return null

  const isCreator = task.createdById === currentUserId
  const isAssignee = task.assignedToId === currentUserId
  const canModify = task.conversationId !== null || isCreator || isAssignee
  const canDelete = task.conversationId !== null || isCreator

  const handleUpdateField = async (fields: Record<string, unknown>) => {
    if (!canModify) { toast.error(t("tasks.noPermission", "Không có quyền")); return }
    try {
      await updateTaskMutation.mutateAsync({ taskId: task.id, payload: fields })
    } catch { toast.error(t("tasks.updateError", "Không thể cập nhật")) }
  }

  const handleSaveTitle = async () => {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(task.title); setIsEditingTitle(false); return }
    if (trimmed !== task.title) await handleUpdateField({ title: trimmed })
    setIsEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    const trimmed = description.trim()
    if (trimmed !== (task.description ?? "")) await handleUpdateField({ description: trimmed || null })
    setIsEditingDesc(false)
  }

  const handleDeleteTask = async () => {
    if (!canDelete) { toast.error(t("tasks.noDeletePermission", "Chỉ người tạo mới được xóa")); return }
    try {
      await deleteTaskMutation.mutateAsync({ taskId: task.id, conversationId: task.conversationId })
      toast.success(t("tasks.deleteSuccess", "Đã xóa"))
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch { toast.error(t("tasks.deleteError", "Không thể xóa")) }
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    try {
      await createSubtaskMutation.mutateAsync({ taskId: task.id, payload: { title: trimmed } })
      setNewSubtaskTitle("")
    } catch { toast.error(t("tasks.addSubtaskError", "Không thể thêm checklist")) }
  }

  const handleToggleSubtask = async (subtaskId: number, isCompleted: boolean) => {
    try { await updateSubtaskMutation.mutateAsync({ taskId: task.id, subtaskId, payload: { isCompleted } }) }
    catch { toast.error(t("tasks.updateSubtaskError", "Lỗi cập nhật")) }
  }

  const handleDeleteSubtask = async (subtaskId: number) => {
    try { await deleteSubtaskMutation.mutateAsync({ taskId: task.id, subtaskId }) }
    catch { toast.error(t("tasks.deleteSubtaskError", "Lỗi xóa")) }
  }

  const totalSubtasks = task.subtasks?.length ?? 0
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length ?? 0
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="notion-modal-detail w-[min(52rem,calc(100vw-2rem))] max-w-3xl gap-0 rounded-xl border border-[var(--notion-border)] bg-[var(--notion-popover)] p-0 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh] max-h-[780px]">

          {/* LEFT: Main content area */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 min-w-0 border-r border-[var(--notion-border)]">

            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--notion-text-tertiary)]">
                  Task #{task.id}
                </span>
                <button onClick={() => onOpenChange(false)} className="notion-icon-btn md:hidden">
                  <XIcon className="size-4" />
                </button>
              </div>

              {/* Title inline edit */}
              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  className="notion-input text-xl font-bold"
                  autoFocus
                  disabled={!canModify}
                />
              ) : (
                <h2
                  onClick={() => canModify && setIsEditingTitle(true)}
                  className={`text-xl font-bold text-[var(--notion-text)] leading-snug break-words ${canModify ? "notion-editable" : ""}`}
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <span className="notion-section-label">
                <FileTextIcon className="size-3.5" />
                {t("tasks.description", "Mô tả")}
              </span>
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("tasks.descriptionPlaceholder", "Thêm mô tả...")}
                    className="notion-textarea min-h-[100px]"
                    autoFocus
                    disabled={!canModify}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setDescription(task.description ?? ""); setIsEditingDesc(false) }} className="notion-btn-secondary">
                      {t("tasks.cancel", "Hủy")}
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveDesc} className="notion-btn-primary">
                      {t("tasks.save", "Lưu")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => canModify && setIsEditingDesc(true)}
                  className={`text-sm text-[var(--notion-text)] leading-relaxed whitespace-pre-wrap min-h-[40px] rounded-md ${canModify ? "notion-editable" : ""}`}
                >
                  {task.description ? (
                    task.description
                  ) : (
                    <span className="text-[var(--notion-text-tertiary)] italic">
                      {canModify ? t("tasks.addDesc", "Thêm mô tả...") : "—"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-3">
              <span className="notion-section-label">
                <CheckSquareIcon className="size-3.5" />
                Checklist
              </span>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--notion-muted)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--notion-accent)] rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--notion-text-tertiary)] min-w-[50px] text-right">
                    {completedSubtasks}/{totalSubtasks} ({progressPct}%)
                  </span>
                </div>
              )}

              {/* Subtask list */}
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
                {task.subtasks?.map((subtask) => (
                  <div key={subtask.id} className="notion-subtask-item group">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={subtask.isCompleted}
                        onChange={(e) => handleToggleSubtask(subtask.id, e.target.checked)}
                        disabled={!canModify}
                        className="notion-checkbox"
                      />
                      <span className={cn("text-sm break-all", subtask.isCompleted ? "line-through text-[var(--notion-text-tertiary)]" : "text-[var(--notion-text)]")}>
                        {subtask.title}
                      </span>
                    </div>
                    {canModify && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="notion-subtask-delete opacity-0 group-hover:opacity-100"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add subtask */}
              {canModify && (
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder={t("tasks.addChecklistPlaceholder", "Thêm mục...")}
                    className="notion-input flex-1"
                    disabled={createSubtaskMutation.isPending}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={createSubtaskMutation.isPending || !newSubtaskTitle.trim()}
                    className="notion-btn-secondary h-8 px-3 gap-1"
                  >
                    <PlusIcon className="size-3.5" />
                    {t("tasks.add", "Thêm")}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT: Properties sidebar */}
          <div className="notion-sidebar w-full md:w-56 bg-[var(--notion-muted)]/40 p-5 flex flex-col justify-between gap-5 shrink-0 h-auto md:h-full">

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="notion-section-label">{t("tasks.details", "Chi tiết")}</span>
                <button onClick={() => onOpenChange(false)} className="notion-icon-btn hidden md:block">
                  <XIcon className="size-4" />
                </button>
              </div>

              {/* Status */}
              <div className="notion-field">
                <label className="notion-label-sm">{t("tasks.status", "Trạng thái")}</label>
                <select
                  value={task.status}
                  onChange={(e) => handleUpdateField({ status: e.target.value })}
                  disabled={!canModify}
                  className="notion-select"
                >
                  {(["todo", "in_progress", "completed"] as const).map((s) => (
                    <option key={s} value={s}>{statusLabel(s, t)}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="notion-field">
                <label className="notion-label-sm">{t("tasks.priority", "Ưu tiên")}</label>
                <select
                  value={task.priority}
                  onChange={(e) => handleUpdateField({ priority: e.target.value })}
                  disabled={!canModify}
                  className="notion-select"
                >
                  {(["low", "medium", "high"] as const).map((p) => (
                    <option key={p} value={p}>{priorityLabel(p, t)}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="notion-field">
                <label className="notion-label-sm flex items-center gap-1">
                  <UserIcon className="size-3" />
                  {t("tasks.assignee", "Người thực hiện")}
                </label>
                <select
                  value={task.assignedToId ?? ""}
                  onChange={(e) => handleUpdateField({ assignedToId: e.target.value ? Number(e.target.value) : null })}
                  disabled={!canModify}
                  className="notion-select"
                >
                  <option value="">{t("tasks.unassigned", "Chưa giao")}</option>
                  {task.conversationId ? members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.displayName}</option>
                  )) : (
                    <option value={currentUserId}>{t("tasks.assignToMe", "Giao cho tôi")}</option>
                  )}
                </select>
              </div>

              {/* Due Date */}
              <div className="notion-field">
                <label className="notion-label-sm flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {t("tasks.dueDate", "Hạn chót")}
                </label>
                <DatePicker
                  value={task.dueDate ?? undefined}
                  onChange={(date) => handleUpdateField({ dueDate: date ? new Date(date).toISOString() : null })}
                  disabled={!canModify}
                />
              </div>

              {/* Creator */}
              <div className="pt-3 border-t border-[var(--notion-border)]">
                <label className="notion-label-sm mb-2 block">{t("tasks.createdBy", "Tạo bởi")}</label>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.creator?.avatar ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
                      {task.creator?.displayName?.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-[var(--notion-text)] truncate">{task.creator?.displayName}</span>
                </div>
              </div>
            </div>

            {/* Delete */}
            {canDelete && (
              <div className="pt-4 border-t border-[var(--notion-border)]">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="notion-btn-danger w-full text-xs h-8 justify-center gap-1.5"
                >
                  <Trash2Icon className="size-3.5" />
                  {t("tasks.deleteTask", "Xóa công việc")}
                </Button>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="notion-modal w-[min(26rem,calc(100vw-2rem))] max-w-sm gap-5 rounded-xl border border-[var(--notion-border)] bg-[var(--notion-popover)] p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[var(--notion-red)]">
              <AlertCircleIcon className="size-5" />
              {t("tasks.confirmDeleteTitle", "Xác nhận xóa")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-xs text-[var(--notion-text-secondary)] leading-relaxed">
            {t("tasks.confirmDeleteDesc", "Công việc và checklist sẽ bị xóa vĩnh viễn.")}
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleteTaskMutation.isPending} className="notion-btn-secondary px-4">
              {t("tasks.cancel", "Hủy")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleteTaskMutation.isPending}
              className="notion-btn-danger min-w-[80px]"
            >
              {deleteTaskMutation.isPending ? <LoaderIcon className="size-4 animate-spin" /> : t("tasks.delete", "Xóa")}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}