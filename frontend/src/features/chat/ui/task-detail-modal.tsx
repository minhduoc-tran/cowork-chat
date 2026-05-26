import * as React from "react"
import { AlertCircleIcon, CalendarIcon, CheckSquareIcon, ClockIcon, FileTextIcon, LoaderIcon, PlusIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { cn } from "@/shared/lib/utils"
import type { Task } from "@/shared/api"
import {
  useCreateSubtask,
  useDeleteSubtask,
  useDeleteTask,
  useUpdateSubtask,
  useUpdateTask,
  useAddTagToTask,
  useRemoveTagFromTask,
  useConversationTags,
  useCreateConversationTag,
  useAddTaskMember,
  useRemoveTaskMember
} from "@/shared/api"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import { DatePicker } from "@/shared/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { RichTextEditor } from "@/shared/ui/rich-text-editor"

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

  const addTagMutation = useAddTagToTask()
  const removeTagMutation = useRemoveTagFromTask()
  const createTagMutation = useCreateConversationTag()
  const { data: conversationTags = [] } = useConversationTags(task?.conversationId)

  const addTaskMemberMutation = useAddTaskMember()
  const removeTaskMemberMutation = useRemoveTaskMember()

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [isEditingDesc, setIsEditingDesc] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)

  const [showCreateTag, setShowCreateTag] = React.useState(false)
  const [newTagName, setNewTagName] = React.useState("")
  const [newTagColor, setNewTagColor] = React.useState("#808080")
  
  const [estimatedValue, setEstimatedValue] = React.useState("")
  const [estimatedUnit, setEstimatedUnit] = React.useState<"minutes" | "hours" | "days">("hours")
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = React.useState(false)

  React.useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setIsEditingTitle(false)
      setIsEditingDesc(false)
      setNewSubtaskTitle("")
      setShowCreateTag(false)
      setNewTagName("")
      setEstimatedValue(task.estimatedValue !== null && task.estimatedValue !== undefined ? String(task.estimatedValue) : "")
      setEstimatedUnit(task.estimatedUnit || "hours")
      setAssigneeDropdownOpen(false)
    }
  }, [task])

  if (!task) return null

  const getMyRole = () => {
    if (!task.conversationId) {
      if (task.createdById === currentUserId) return "owner"
      if (task.assignedToId === currentUserId) return "assignee"
      return null
    }
    const member = task.members?.find((m) => m.userId === currentUserId)
    if (member) return member.role
    if (task.createdById === currentUserId) return "owner"
    if (task.assignedToId === currentUserId) return "assignee"
    return "watcher"
  }

  const myRole = getMyRole()
  const isOwner = myRole === "owner"
  const isMemberAssignee = myRole === "assignee"

  const canModifyCritical = isOwner
  const canModifyStatusAndHours = isOwner || isMemberAssignee
  const canDelete = isOwner

  const handleUpdateField = async (fields: Record<string, unknown>) => {
    const isCriticalFieldUpdate =
      fields.title !== undefined ||
      fields.description !== undefined ||
      fields.priority !== undefined ||
      fields.dueDate !== undefined ||
      fields.assignedToId !== undefined

    const isStatusOrHoursUpdate =
      fields.status !== undefined ||
      fields.estimatedValue !== undefined ||
      fields.estimatedUnit !== undefined

    if (isCriticalFieldUpdate && !canModifyCritical) {
      toast.error(t("tasks.noPermission", "Chỉ người quản lý (owner) mới có quyền chỉnh sửa chi tiết."))
      return
    }

    if (isStatusOrHoursUpdate && !canModifyStatusAndHours) {
      toast.error(t("tasks.noPermission", "Bạn không có quyền chỉnh sửa trạng thái hoặc thời gian."))
      return
    }

    try {
      await updateTaskMutation.mutateAsync({ taskId: task.id, payload: fields })
    } catch {
      toast.error(t("tasks.updateError", "Không thể cập nhật"))
    }
  }

  const handleSaveTitle = async () => {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(task.title); setIsEditingTitle(false); return }
    if (trimmed !== task.title) await handleUpdateField({ title: trimmed })
    setIsEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    const textContent = description.replace(/<[^>]*>/g, "").trim()
    const cleanHtml = textContent === "" ? "" : description.trim()
    if (cleanHtml !== (task.description ?? "")) {
      await handleUpdateField({ description: cleanHtml || null })
    }
    setIsEditingDesc(false)
  }

  const handleSaveEstimate = async (value: string, unit: "minutes" | "hours" | "days") => {
    const val = value.trim()
    const num = val === "" ? null : Number(val)
    if (val !== "" && isNaN(num as any)) return
    if (num !== task.estimatedValue || unit !== task.estimatedUnit) {
      await handleUpdateField({ estimatedValue: num, estimatedUnit: num ? unit : null })
    }
  }

  const handleAddAssignee = async (userId: number) => {
    try {
      await addTaskMemberMutation.mutateAsync({ taskId: task.id, userId, role: "assignee" })
      toast.success(t("tasks.addAssigneeSuccess", "Đã gán người thực hiện"))
    } catch {
      toast.error(t("tasks.addAssigneeError", "Không thể gán người thực hiện"))
    }
  }

  const handleRemoveAssignee = async (userId: number) => {
    try {
      await removeTaskMemberMutation.mutateAsync({ taskId: task.id, userId })
      toast.success(t("tasks.removeAssigneeSuccess", "Đã gỡ người thực hiện"))
    } catch {
      toast.error(t("tasks.removeAssigneeError", "Không thể gỡ người thực hiện"))
    }
  }

  const handleAddTag = async (tagId: number) => {
    try {
      await addTagMutation.mutateAsync({ taskId: task.id, tagId })
      toast.success(t("tasks.addTagSuccess", "Đã gắn nhãn"))
    } catch {
      toast.error(t("tasks.addTagError", "Không thể thêm nhãn vào công việc"))
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    try {
      await removeTagMutation.mutateAsync({ taskId: task.id, tagId })
      toast.success(t("tasks.removeTagSuccess", "Đã gỡ nhãn"))
    } catch {
      toast.error(t("tasks.removeTagError", "Không thể xóa nhãn khỏi công việc"))
    }
  }

  const handleCreateAndAddTag = async () => {
    const trimmed = newTagName.trim()
    if (!trimmed || !task.conversationId) return
    try {
      const newTag = await createTagMutation.mutateAsync({
        conversationId: task.conversationId,
        data: { name: trimmed, color: newTagColor }
      })
      if (newTag?.id) {
        await addTagMutation.mutateAsync({ taskId: task.id, tagId: newTag.id })
      }
      setNewTagName("")
      setShowCreateTag(false)
      toast.success(t("tasks.createTagSuccess", "Tạo và gắn nhãn thành công"))
    } catch {
      toast.error(t("tasks.createTagError", "Không thể tạo nhãn mới"))
    }
  }

  const handleDeleteTask = async () => {
    if (!canDelete) { toast.error(t("tasks.noDeletePermission", "Chỉ người tạo/quản lý mới được xóa")); return }
    try {
      await deleteTaskMutation.mutateAsync({ taskId: task.id, conversationId: task.conversationId })
      toast.success(t("tasks.deleteSuccess", "Đã xóa"))
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch { toast.error(t("tasks.deleteError", "Không thể xóa")) }
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canModifyStatusAndHours) {
      toast.error(t("tasks.noPermission", "Bạn không có quyền thêm checklist phụ."))
      return
    }
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    try {
      await createSubtaskMutation.mutateAsync({ taskId: task.id, payload: { title: trimmed } })
      setNewSubtaskTitle("")
    } catch { toast.error(t("tasks.addSubtaskError", "Không thể thêm checklist")) }
  }

  const handleToggleSubtask = async (subtaskId: number, isCompleted: boolean) => {
    if (!canModifyStatusAndHours) {
      toast.error(t("tasks.noPermission", "Bạn không có quyền cập nhật trạng thái checklist."))
      return
    }
    try { await updateSubtaskMutation.mutateAsync({ taskId: task.id, subtaskId, payload: { isCompleted } }) }
    catch { toast.error(t("tasks.updateSubtaskError", "Lỗi cập nhật")) }
  }

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!canModifyCritical) {
      toast.error(t("tasks.noPermission", "Chỉ người quản lý (owner) mới có quyền xóa checklist."))
      return
    }
    try { await deleteSubtaskMutation.mutateAsync({ taskId: task.id, subtaskId }) }
    catch { toast.error(t("tasks.deleteSubtaskError", "Lỗi xóa")) }
  }

  const totalSubtasks = task.subtasks?.length ?? 0
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length ?? 0
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="notion-modal-detail w-[min(58rem,calc(100vw-2rem))] max-w-4xl gap-0 rounded-xl border border-[var(--notion-border)] bg-[var(--notion-popover)] p-0 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[85vh] max-h-[840px]">

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
                  disabled={!canModifyCritical}
                />
              ) : (
                <h2
                  onClick={() => canModifyCritical && setIsEditingTitle(true)}
                  className={`text-xl font-bold text-[var(--notion-text)] leading-snug break-words ${canModifyCritical ? "notion-editable" : ""}`}
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
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder={t("tasks.descriptionPlaceholder", "Thêm mô tả...")}
                    disabled={!canModifyCritical}
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
                  onClick={() => canModifyCritical && setIsEditingDesc(true)}
                  className={`text-sm text-[var(--notion-text)] leading-relaxed min-h-[40px] rounded-md notion-rich-text-preview ${canModifyCritical ? "notion-editable" : ""}`}
                >
                  {task.description ? (
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  ) : (
                    <span className="text-[var(--notion-text-tertiary)] italic">
                      {canModifyCritical ? t("tasks.addDesc", "Thêm mô tả...") : "—"}
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
                        disabled={!canModifyStatusAndHours}
                        className="notion-checkbox"
                      />
                      <span className={cn("text-sm break-all", subtask.isCompleted ? "line-through text-[var(--notion-text-tertiary)]" : "text-[var(--notion-text)]")}>
                        {subtask.title}
                      </span>
                    </div>
                    {canModifyCritical && (
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
              {canModifyStatusAndHours && (
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
          <div className="notion-sidebar w-full md:w-80 bg-[var(--notion-popover)] p-5 flex flex-col justify-between gap-5 shrink-0 h-auto md:h-full border-l border-[var(--notion-border)]">

            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-widest text-[var(--notion-text-tertiary)]">{t("tasks.details", "Chi tiết")}</span>
                <button onClick={() => onOpenChange(false)} className="notion-icon-btn hidden md:block">
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="notion-property-grid">
                {/* Status */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--notion-text-tertiary)] mr-1.5" />
                    {t("tasks.status", "Trạng thái")}
                  </span>
                  <div className="notion-property-value">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateField({ status: e.target.value })}
                      disabled={!canModifyStatusAndHours}
                      className="notion-property-select"
                    >
                      {(["todo", "in_progress", "completed"] as const).map((s) => (
                        <option key={s} value={s}>{statusLabel(s, t)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--notion-red)] mr-1.5" />
                    {t("tasks.priority", "Ưu tiên")}
                  </span>
                  <div className="notion-property-value">
                    <select
                      value={task.priority}
                      onChange={(e) => handleUpdateField({ priority: e.target.value })}
                      disabled={!canModifyCritical}
                      className="notion-property-select"
                    >
                      {(["low", "medium", "high"] as const).map((p) => (
                        <option key={p} value={p}>{priorityLabel(p, t)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Assignee */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <UserIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                    {t("tasks.assignee", "Người gán")}
                  </span>
                  <div className="notion-property-value flex flex-wrap gap-1 items-center">
                    {task.members?.filter(m => m.role === "assignee").map((m) => (
                      <div key={m.id} className="flex items-center gap-1 bg-[var(--notion-muted)] pl-0.5 pr-1.5 py-0.5 rounded-md text-[11px] border border-[var(--notion-border)]">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={m.user.avatar ?? undefined} />
                          <AvatarFallback className="text-[8px] bg-[var(--notion-card)] text-[var(--notion-text-secondary)]">
                            {m.user.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[70px] text-[var(--notion-text)] font-medium">{m.user.displayName}</span>
                        {canModifyCritical && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignee(m.user.id)}
                            className="text-[var(--notion-text-tertiary)] hover:text-[var(--notion-red)] font-bold text-[10px] ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Fallback to task.assignee for backward compatibility */}
                    {(!task.members || task.members.filter(m => m.role === "assignee").length === 0) && task.assignee && (
                      <div className="flex items-center gap-1 bg-[var(--notion-muted)] pl-0.5 pr-1.5 py-0.5 rounded-md text-[11px] border border-[var(--notion-border)]">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={task.assignee.avatar ?? undefined} />
                          <AvatarFallback className="text-[8px] bg-[var(--notion-card)] text-[var(--notion-text-secondary)]">
                            {task.assignee.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[70px] text-[var(--notion-text)] font-medium">{task.assignee.displayName}</span>
                        {canModifyCritical && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (task.assignee) {
                                await handleUpdateField({ assignedToId: null })
                              }
                            }}
                            className="text-[var(--notion-text-tertiary)] hover:text-[var(--notion-red)] font-bold text-[10px] ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}

                    {/* Add assignee button */}
                    {canModifyCritical && (
                      <Popover open={assigneeDropdownOpen} onOpenChange={setAssigneeDropdownOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] border border-dashed border-[var(--notion-border)] hover:bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]"
                          >
                            <PlusIcon className="size-2.5" />
                            <span>Thêm</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={4} className="p-0 bg-transparent border-none shadow-none ring-0 w-44">
                          <div className="max-h-[160px] w-44 overflow-y-auto rounded-md border border-[var(--notion-border)] bg-[var(--notion-popover)] py-1 shadow-lg">
                            {task.conversationId ? (
                              members
                                .filter((m) => !task.members?.some((tm) => tm.userId === m.userId && tm.role === "assignee") && (task.assignee?.id !== m.userId))
                                .map((m) => (
                                  <button
                                    key={m.userId}
                                    type="button"
                                    onClick={() => {
                                      void handleAddAssignee(m.userId)
                                      setAssigneeDropdownOpen(false)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                                  >
                                    <Avatar className="h-4.5 w-4.5">
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
                                  void handleAddAssignee(currentUserId)
                                  setAssigneeDropdownOpen(false)
                                }}
                                className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--notion-text)] hover:bg-[var(--notion-muted)]"
                              >
                                {t("tasks.assignToMe", "Giao cho tôi")}
                              </button>
                            )}
                            {task.conversationId &&
                              members.filter((m) => !task.members?.some((tm) => tm.userId === m.userId && tm.role === "assignee") && (task.assignee?.id !== m.userId)).length === 0 && (
                                <div className="px-3 py-1.5 text-center text-[10px] text-[var(--notion-text-tertiary)] italic">
                                  {t("tasks.allAssigned", "Đã gán cho tất cả")}
                                </div>
                              )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <CalendarIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                    {t("tasks.dueDate", "Hạn chót")}
                  </span>
                  <div className="notion-property-value">
                    <DatePicker
                      value={task.dueDate ?? undefined}
                      onChange={(date) => handleUpdateField({ dueDate: date ? new Date(date).toISOString() : null })}
                      disabled={!canModifyCritical}
                      className="h-8 text-xs !border-transparent !bg-transparent hover:!bg-[var(--notion-muted)] px-1.5 focus:!border-[var(--notion-border)] focus:!ring-0 shadow-none"
                    />
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <ClockIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5" />
                    {t("tasks.estimatedTime", "Ước tính")}
                  </span>
                  <div className="notion-property-value">
                    <div className="flex gap-1 items-center w-full">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        onBlur={() => handleSaveEstimate(estimatedValue, estimatedUnit)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEstimate(estimatedValue, estimatedUnit)}
                        disabled={!canModifyStatusAndHours}
                        className="notion-property-input w-14 text-center"
                        placeholder="—"
                      />
                      <select
                        value={estimatedUnit}
                        onChange={(e) => {
                          const unit = e.target.value as "minutes" | "hours" | "days"
                          setEstimatedUnit(unit)
                          void handleSaveEstimate(estimatedValue, unit)
                        }}
                        disabled={!canModifyStatusAndHours}
                        className="notion-property-select flex-1 min-w-[72px]"
                      >
                        <option value="minutes">{t("tasks.minutes", "phút")}</option>
                        <option value="hours">{t("tasks.hours", "giờ")}</option>
                        <option value="days">{t("tasks.days", "ngày")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="notion-property-row">
                  <span className="notion-property-label">
                    <PlusIcon className="size-3.5 text-[var(--notion-text-tertiary)] mr-1.5 rotate-45" />
                    {t("tasks.tags", "Nhãn")}
                  </span>
                  <div className="notion-property-value flex flex-wrap gap-1 items-center">
                    {task.tags?.map((taskTag) => (
                      <span
                        key={taskTag.tag.id}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all group/tag"
                        style={{
                          backgroundColor: `${taskTag.tag.color}15`,
                          color: taskTag.tag.color,
                          border: `1px solid ${taskTag.tag.color}30`
                        }}
                      >
                        {taskTag.tag.name}
                        {canModifyStatusAndHours && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(taskTag.tag.id)}
                            className="hover:bg-black/10 rounded-full p-0.5 text-[var(--notion-text)]"
                          >
                            <XIcon className="size-2" />
                          </button>
                        )}
                      </span>
                    ))}
                    {canModifyStatusAndHours && (
                      <Popover open={showCreateTag} onOpenChange={setShowCreateTag}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-[var(--notion-border)] hover:bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]"
                          >
                            <PlusIcon className="size-2.5" />
                            <span>Thêm</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" sideOffset={4} className="p-2 w-44 bg-[var(--notion-popover)] border border-[var(--notion-border)] shadow-md flex flex-col gap-2 rounded-md ring-0">
                          {/* List of existing tags to add */}
                          {conversationTags.length > 0 && (
                            <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pb-1.5 border-b border-[var(--notion-border)]">
                              <span className="text-[9px] uppercase font-bold text-[var(--notion-text-tertiary)]">
                                {t("tasks.selectTag", "Chọn nhãn")}
                              </span>
                              {conversationTags
                                .filter((t) => !task.tags?.some((tt) => tt.tag.id === t.id))
                                .map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => {
                                      void handleAddTag(tag.id)
                                    }}
                                    className="flex items-center justify-between w-full text-left px-1.5 py-0.5 rounded text-[11px] hover:bg-[var(--notion-muted)] text-[var(--notion-text)]"
                                  >
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                      {tag.name}
                                    </span>
                                  </button>
                                ))}
                              {conversationTags.filter((t) => !task.tags?.some((tt) => tt.tag.id === t.id)).length === 0 && (
                                <span className="text-[10px] text-[var(--notion-text-tertiary)] italic">
                                  {t("tasks.noMoreTags", "Không còn nhãn")}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Form to create a new tag */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] uppercase font-bold text-[var(--notion-text-tertiary)]">
                              {t("tasks.createNewTag", "Tạo nhãn mới")}
                            </span>
                            <input
                              type="text"
                              placeholder={t("tasks.tagNamePlaceholder", "Tên nhãn...")}
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              className="notion-input h-7 text-xs px-2"
                            />
                            <div className="flex flex-col gap-1.5">
                              {/* Preset color pickers */}
                              <div className="flex flex-wrap gap-1">
                                {["#e05a47", "#e2863b", "#e5ac37", "#499662", "#3581ba", "#865fc5", "#c24e93", "#808080"].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewTagColor(c)}
                                    className={cn(
                                      "w-3 h-3 rounded-full border border-black/10 transition-all",
                                      newTagColor === c && "ring-1 ring-[var(--notion-text)] scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateAndAddTag}
                                disabled={!newTagName.trim() || createTagMutation.isPending}
                                className="notion-btn-primary h-6 text-[10px] w-full mt-1"
                              >
                                {createTagMutation.isPending ? t("tasks.creating", "Đang tạo...") : t("tasks.create", "Tạo")}
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Creator */}
                <div className="notion-property-row pt-3 border-t border-[var(--notion-border)] mt-2">
                  <span className="notion-property-label">
                    {t("tasks.createdBy", "Tạo bởi")}
                  </span>
                  <div className="notion-property-value">
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