import * as React from "react"
import { createPortal } from "react-dom"
import type { DragEndEvent, DragStartEvent, DragOverEvent } from "@dnd-kit/core"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  CalendarIcon,
  GripVertical,
  MessageSquareIcon,
  PlusIcon,
  TagIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import type { Task, TaskStatus } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Badge } from "@/shared/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, "")
}

// Notion card: warm cream surface, minimal border, content-first
function TaskCardContent({
  task,
  isDragging,
  isOverlay,
}: TaskCardContentProps) {
  const { t } = useTranslation()

  const isOverdue = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr || status === "completed") return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dueDateStr) < today
  }

  const cardOverdue = isOverdue(task.dueDate, task.status)

  const priorityLabels: Record<string, string> = {
    high: t("tasks.priorityHigh", "Cao"),
    medium: t("tasks.priorityMedium", "Trung bình"),
    low: t("tasks.priorityLow", "Thấp"),
  }

  const assignees = task.members?.filter((m) => m.role === "assignee") || []

  return (
    <div
      className={cn(
        "notion-card group relative flex flex-col gap-2 transition-all select-none",
        isOverlay && "notion-card--dragging",
        isDragging &&
          !isOverlay &&
          "border-dashed bg-[var(--notion-muted)] opacity-30"
      )}
    >
      {/* Priority Badge - top position */}
      {task.priority && (
        <Badge
          variant="outline"
          className="w-fit gap-1 text-[10px]"
          style={{
            borderColor: `var(--notion-${task.priority === "high" ? "red" : task.priority === "medium" ? "orange" : "blue"})`,
            color: `var(--notion-${task.priority === "high" ? "red" : task.priority === "medium" ? "orange" : "blue"})`,
          }}
        >
          <span
            className={cn(
              "h-1 w-1 rounded-full",
              task.priority === "high" && "bg-[var(--notion-red)]",
              task.priority === "medium" && "bg-[var(--notion-orange)]",
              task.priority === "low" && "bg-[var(--notion-blue)]"
            )}
          />
          {priorityLabels[task.priority]}
        </Badge>
      )}

      {/* Title */}
      <h4
        className={cn(
          "pr-1 text-sm leading-snug font-medium text-[var(--notion-text)]",
          !isDragging &&
            !isOverlay &&
            "group-hover:text-[var(--notion-text-hover)]"
        )}
      >
        {task.title}
      </h4>

      {/* Tags row under title - with TagIcon for each tag */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {task.tags.map((taskTag) => (
            <Badge
              key={taskTag.tag.id}
              variant="outline"
              className="w-fit gap-1 text-[10px]"
              style={{
                borderColor: `${taskTag.tag.color}50`,
                color: taskTag.tag.color,
              }}
            >
              <TagIcon className="size-2.5" />
              <span className="whitespace-nowrap">{taskTag.tag.name}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Bottom row: due date + comment count + assignee */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                cardOverdue && "font-medium text-[var(--notion-red)]"
              )}
            >
              <CalendarIcon className="size-3" />
              <span className="whitespace-nowrap">
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {/* Comment count */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--notion-text-tertiary)]">
              <MessageSquareIcon className="size-3" />
              <span className="whitespace-nowrap">{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Assignee avatar */}
        {assignees.length > 0 ? (
          <Avatar className="h-5 w-5" title={assignees[0].user.displayName}>
            <AvatarImage src={assignees[0].user.avatar ?? undefined} />
            <AvatarFallback className="bg-[var(--notion-muted)] text-[9px] text-[var(--notion-text-secondary)]">
              {assignees[0].user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : task.assignee ? (
          <Avatar className="h-5 w-5" title={task.assignee.displayName}>
            <AvatarImage src={task.assignee.avatar ?? undefined} />
            <AvatarFallback className="bg-[var(--notion-muted)] text-[9px] text-[var(--notion-text-secondary)]">
              {task.assignee.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  )
}

interface TaskCardContentProps {
  task: Task
  isDragging?: boolean
  isOverlay?: boolean
}

function SortableTaskCard({ task, onSelectTask }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
      }
    : undefined

  const handleClick = () => {
    if (isDragging) return
    onSelectTask(task)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className="outline-none"
    >
      <TaskCardContent task={task} isDragging={isDragging} />
    </div>
  )
}

interface DraggableTaskCardProps {
  task: Task
  onSelectTask: (task: Task) => void
}

interface ColumnMenuProps {
  column: { id: number; key: string; name: string; color: string }
  onRename: (name: string) => void
  onChangeColor: (color: string) => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onDelete: () => void
}

function ColumnMenu({
  column,
  onRename,
  onChangeColor,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: ColumnMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [newName, setNewName] = React.useState(column.name)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsEditing(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const colors = [
    "gray",
    "blue",
    "green",
    "orange",
    "red",
    "purple",
    "pink",
    "yellow",
  ]

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim()) {
      onRename(newName.trim())
      setIsEditing(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer rounded p-1 text-[var(--notion-text-tertiary)] transition-all select-none hover:bg-[var(--notion-muted)] hover:text-[var(--notion-text-secondary)]"
      >
        <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[99] mt-1.5 flex w-52 flex-col gap-0.5 rounded-md border border-[var(--notion-border)] bg-[var(--notion-popover)] p-1.5 shadow-xl">
          {isEditing ? (
            <form
              onSubmit={handleSaveRename}
              className="flex flex-col gap-1.5 p-1"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded border border-[var(--notion-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--notion-text)] focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="cursor-pointer rounded border border-[var(--notion-border)] px-2 py-0.5 text-[10px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)]"
                >
                  {t("tasks.cancel", "Hủy")}
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded bg-[var(--notion-blue)] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[var(--notion-blue-hover)]"
                >
                  {t("tasks.save", "Lưu")}
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex w-full cursor-pointer items-center rounded px-2.5 py-2 text-left text-xs text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)]"
              >
                Đổi tên cột
              </button>
              <div className="my-1 border-t border-[var(--notion-border)]" />
              <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--notion-text-tertiary)] uppercase">
                Màu sắc
              </div>
              <div className="grid grid-cols-4 gap-1 p-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChangeColor(c)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "h-4 cursor-pointer rounded border border-transparent transition-transform hover:scale-105",
                      c === "gray" && "bg-gray-100 dark:bg-gray-800",
                      c === "blue" && "bg-blue-100 dark:bg-blue-900/40",
                      c === "green" && "bg-green-100 dark:bg-green-900/40",
                      c === "orange" && "bg-orange-100 dark:bg-orange-900/40",
                      c === "red" && "bg-red-100 dark:bg-red-900/40",
                      c === "purple" && "bg-purple-100 dark:bg-purple-900/40",
                      c === "pink" && "bg-pink-100 dark:bg-pink-900/40",
                      c === "yellow" && "bg-yellow-100 dark:bg-yellow-900/40",
                      column.color === c &&
                        "scale-105 border-[var(--notion-blue)]"
                    )}
                  />
                ))}
              </div>
              <div className="my-1 border-t border-[var(--notion-border)]" />
              <div className="flex gap-1 p-1">
                <button
                  type="button"
                  onClick={() => {
                    onMoveLeft()
                    setIsOpen(false)
                  }}
                  className="flex-1 cursor-pointer rounded border border-[var(--notion-border)] py-1 text-center text-[10px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)]"
                >
                  ← Trái
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMoveRight()
                    setIsOpen(false)
                  }}
                  className="flex-1 cursor-pointer rounded border border-[var(--notion-border)] py-1 text-center text-[10px] text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)]"
                >
                  Phải →
                </button>
              </div>
              {column.id > 0 && (
                <>
                  <div className="my-1 border-t border-[var(--notion-border)]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsConfirmOpen(true)
                      setIsOpen(false)
                    }}
                    className="flex w-full cursor-pointer items-center rounded px-2.5 py-2 text-left text-xs font-medium text-[var(--notion-red)] hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    Xóa cột
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {column.id > 0 && (
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("tasks.deleteColumnTitle", "Xóa cột trạng thái")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "tasks.confirmDeleteColumn",
                  "Bạn có chắc chắn muốn xóa cột này? Các công việc trong cột sẽ tự động chuyển về cột đầu tiên."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>
                {t("tasks.cancel", "Hủy")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDelete()
                  setIsConfirmOpen(false)
                }}
                className="bg-[var(--notion-red)] font-medium text-white hover:bg-[var(--notion-red)]/90"
              >
                {t("tasks.delete", "Xóa")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function SortableColumn({
  id,
  label,
  color,
  count,
  children,
  onAddTask,
  menu,
}: DroppableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${id}`,
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id })
  const { t } = useTranslation()

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
      }
    : undefined

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        "notion-column flex min-h-[380px] w-[280px] shrink-0 flex-col rounded-lg md:w-[300px]",
        isDragging && "notion-column--placeholder"
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg p-1.5 transition-colors duration-200",
          isOver && !isDragging && "bg-[var(--notion-muted)]",
          isDragging && "invisible"
        )}
      >
        {/* Column header */}
        <div className="notion-column-header group/header flex h-8 items-center justify-between pr-1">
          <div className="flex items-center gap-1 select-none">
            {/* Grip handle for dragging column */}
            <div
              className="shrink-0 cursor-grab rounded p-0.5 text-[var(--notion-text-tertiary)] transition-colors hover:bg-[var(--notion-muted)] hover:text-[var(--notion-text-secondary)] active:cursor-grabbing"
              {...attributes}
              {...listeners}
              title="Kéo để đổi thứ tự cột"
            >
              <GripVertical className="size-3.5" />
            </div>

            <span
              className="text-sm font-medium"
              style={{
                color: `var(--notion-${color})`,
              }}
            >
              {label}
            </span>
            <span className="ml-1.5 text-xs font-normal text-[var(--notion-text-tertiary)]">
              {count}
            </span>
          </div>
          <div
            className="flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask()}
                className="cursor-pointer rounded p-1 text-[var(--notion-text-tertiary)] opacity-0 transition-all group-hover/header:opacity-100 hover:bg-[var(--notion-muted)] hover:text-[var(--notion-text-secondary)]"
                title={t("tasks.new", "Mới")}
              >
                <PlusIcon className="size-3.5" />
              </button>
            )}
            {menu}
          </div>
        </div>

        {/* Quick Add Button at the top */}
        {onAddTask && (
          <button
            type="button"
            onClick={() => onAddTask()}
            className="flex w-full shrink-0 cursor-pointer items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-xs text-[var(--notion-text-tertiary)] transition-colors select-none hover:bg-[var(--notion-muted)] hover:text-[var(--notion-text-secondary)]"
          >
            <PlusIcon className="size-3.5" />
            <span>{t("tasks.new", "Mới")}</span>
          </button>
        )}

        {/* Cards */}
        <div
          ref={setDroppableRef}
          className="flex min-h-[100px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

interface DroppableColumnProps {
  id: string
  label: string
  color: string
  count: number
  children: React.ReactNode
  onAddTask?: () => void
  menu?: React.ReactNode
}

function AddColumnButton({ onCreate }: { onCreate: (name: string) => void }) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [name, setName] = React.useState("")
  const { t } = useTranslation()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim())
      setName("")
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="notion-column flex w-[280px] shrink-0 flex-col gap-2 rounded-lg border border-dashed border-[var(--notion-border)] bg-[var(--notion-surface)]/50 p-3 md:w-[300px]">
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("tasks.statusPlaceholder", "Tên trạng thái...")}
            className="w-full rounded border border-[var(--notion-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--notion-text)] focus:border-[var(--notion-blue)] focus:outline-none"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="cursor-pointer rounded border border-[var(--notion-border)] px-2.5 py-1.5 text-xs text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)]"
            >
              {t("tasks.cancel", "Hủy")}
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded bg-[var(--notion-blue)] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--notion-blue-hover)]"
            >
              {t("tasks.save", "Lưu")}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="mt-2 flex w-[280px] shrink-0 items-start md:w-[300px]">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--notion-border)] py-2 text-xs text-[var(--notion-text-tertiary)] transition-colors select-none hover:bg-[var(--notion-muted)] hover:text-[var(--notion-text-secondary)]"
      >
        <PlusIcon className="size-3.5" />
        <span>{t("tasks.addColumn", "Thêm cột")}</span>
      </button>
    </div>
  )
}

export function TaskBoard({
  tasks,
  statuses,
  onSelectTask,
  onUpdateTaskStatus,
  onAddTask,
  onCreateStatus,
  onUpdateStatus,
  onDeleteStatus,
}: TaskBoardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const columns = React.useMemo(() => {
    if (statuses && statuses.length > 0) {
      return [...statuses].sort((a, b) => a.position - b.position)
    }
    return [
      {
        id: -1,
        conversationId: null,
        key: "todo",
        name: t("tasks.statusTodo", "Cần làm"),
        color: "gray",
        position: 1000,
      },
      {
        id: -2,
        conversationId: null,
        key: "in_progress",
        name: t("tasks.statusInProgress", "Đang làm"),
        color: "blue",
        position: 2000,
      },
      {
        id: -3,
        conversationId: null,
        key: "completed",
        name: t("tasks.statusCompleted", "Hoàn thành"),
        color: "green",
        position: 3000,
      },
    ]
  }, [statuses, t])

  const sortTasks = React.useCallback((taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const posA =
        a.position !== null && a.position !== undefined ? a.position : Infinity
      const posB =
        b.position !== null && b.position !== undefined ? b.position : Infinity
      if (posA !== posB) return posA - posB
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [])

  // Local tasks state for smooth dragging experience
  const [localTasks, setLocalTasks] = React.useState<Task[]>(() =>
    sortTasks(tasks)
  )
  // Local columns state for smooth column dragging experience
  const [localColumns, setLocalColumns] = React.useState<any[]>(() => columns)

  React.useEffect(() => {
    setLocalTasks(sortTasks(tasks))
  }, [tasks, sortTasks])

  React.useEffect(() => {
    setLocalColumns(columns)
  }, [columns])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString())
  }

  const getColKeyFromId = (idStr: string) => {
    if (idStr.startsWith("column-")) {
      return idStr.replace("column-", "")
    }
    // Is it a column status key directly?
    const directCol = localColumns.find((c) => c.key === idStr)
    if (directCol) return directCol.key

    // Is it a task card ID?
    const task = localTasks.find((t) => t.id.toString() === idStr)
    if (task) return task.status

    return null
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeIdStr = active.id.toString()
    const overIdStr = over.id.toString()

    if (activeIdStr === overIdStr) return

    // Case 1: Dragging a Column
    if (activeIdStr.startsWith("column-")) {
      const activeColKey = activeIdStr.replace("column-", "")
      const overColKey = getColKeyFromId(overIdStr)

      if (overColKey && activeColKey !== overColKey) {
        setLocalColumns((prev) => {
          const activeIdx = prev.findIndex((c) => c.key === activeColKey)
          const overIdx = prev.findIndex((c) => c.key === overColKey)
          if (activeIdx === -1 || overIdx === -1) return prev

          const updated = [...prev]
          const [movedItem] = updated.splice(activeIdx, 1)
          updated.splice(overIdx, 0, movedItem)
          return updated
        })
      }
      return
    }

    // Case 2: Dragging a Card (existing logic)
    if (
      !activeIdStr.startsWith("column-") &&
      !overIdStr.startsWith("column-")
    ) {
      const activeTask = localTasks.find((t) => t.id.toString() === activeIdStr)
      if (!activeTask) return

      const isOverAColumn = localColumns.some((col) => col.key === overIdStr)

      if (isOverAColumn) {
        const targetStatus = overIdStr
        if (activeTask.status !== targetStatus) {
          setLocalTasks((prev) => {
            return prev.map((t) => {
              if (t.id.toString() === activeIdStr) {
                return { ...t, status: targetStatus }
              }
              return t
            })
          })
        }
      } else {
        const overTask = localTasks.find((t) => t.id.toString() === overIdStr)
        if (!overTask) return

        const targetStatus = overTask.status

        if (activeTask.status !== targetStatus) {
          setLocalTasks((prev) => {
            const activeIdx = prev.findIndex(
              (t) => t.id.toString() === activeIdStr
            )
            const overIdx = prev.findIndex((t) => t.id.toString() === overIdStr)

            const updated = [...prev]
            updated[activeIdx] = { ...updated[activeIdx], status: targetStatus }

            const [movedItem] = updated.splice(activeIdx, 1)
            updated.splice(overIdx, 0, movedItem)

            return updated
          })
        } else {
          setLocalTasks((prev) => {
            const activeIdx = prev.findIndex(
              (t) => t.id.toString() === activeIdStr
            )
            const overIdx = prev.findIndex((t) => t.id.toString() === overIdStr)

            const updated = [...prev]
            const [movedItem] = updated.splice(activeIdx, 1)
            updated.splice(overIdx, 0, movedItem)

            return updated
          })
        }
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeIdStr = active.id.toString()
    const overIdStr = over.id.toString()

    // Case 1: Dragging a Column
    if (activeIdStr.startsWith("column-")) {
      const activeColKey = activeIdStr.replace("column-", "")
      const activeCol = localColumns.find((c) => c.key === activeColKey)
      if (!activeCol || activeCol.id < 0) {
        // Fallback mock columns cannot be reordered on server
        setLocalColumns(columns)
        return
      }

      const finalIndex = localColumns.findIndex((c) => c.key === activeColKey)
      let newPosition = 1000

      if (localColumns.length <= 1) {
        newPosition = 1000
      } else if (finalIndex === 0) {
        const nextCol = localColumns[1]
        newPosition = nextCol.position - 1000
      } else if (finalIndex === localColumns.length - 1) {
        const prevCol = localColumns[localColumns.length - 2]
        newPosition = prevCol.position + 1000
      } else {
        const prevCol = localColumns[finalIndex - 1]
        const nextCol = localColumns[finalIndex + 1]
        newPosition = (prevCol.position + nextCol.position) / 2
      }

      const originalCol = columns.find((c) => c.key === activeColKey)
      if (originalCol && originalCol.position !== newPosition) {
        if (onUpdateStatus) {
          onUpdateStatus(activeCol.id, { position: newPosition })
        }
      }
      return
    }

    // Case 2: Dragging a Card (existing logic)
    const activeTask = localTasks.find((t) => t.id.toString() === activeIdStr)
    if (!activeTask) return

    const targetStatus = activeTask.status

    // Get all tasks in target column EXCEPT the one currently being dragged
    const colTasks = localTasks.filter(
      (t) => t.status === targetStatus && t.id.toString() !== activeIdStr
    )

    // Get its final index inside target column
    const finalIndex = localTasks
      .filter((t) => t.status === targetStatus)
      .findIndex((t) => t.id.toString() === activeIdStr)

    let newPosition = 1000

    if (colTasks.length === 0) {
      newPosition = 1000
    } else if (finalIndex === 0) {
      const nextTask = colTasks[0]
      const nextPos =
        nextTask.position !== null && nextTask.position !== undefined
          ? nextTask.position
          : 1000
      newPosition = nextPos - 1000
    } else if (finalIndex >= colTasks.length) {
      const prevTask = colTasks[colTasks.length - 1]
      const prevPos =
        prevTask.position !== null && prevTask.position !== undefined
          ? prevTask.position
          : 0
      newPosition = prevPos + 1000
    } else {
      const prevTask = colTasks[finalIndex - 1]
      const nextTask = colTasks[finalIndex]
      const prevPos =
        prevTask.position !== null && prevTask.position !== undefined
          ? prevTask.position
          : 0
      const nextPos =
        nextTask.position !== null && nextTask.position !== undefined
          ? nextTask.position
          : 1000
      newPosition = (prevPos + nextPos) / 2
    }

    const originalTask = tasks.find((t) => t.id.toString() === activeIdStr)
    if (originalTask) {
      const isStatusChanged = originalTask.status !== targetStatus
      const isPositionChanged = originalTask.position !== newPosition

      if (isStatusChanged || isPositionChanged) {
        onUpdateTaskStatus(Number(activeIdStr), targetStatus, newPosition)
      }
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setLocalTasks(sortTasks(tasks)) // Revert tasks on cancel
    setLocalColumns(columns) // Revert columns on cancel
  }

  const handleMoveStatus = (index: number, direction: "left" | "right") => {
    if (!onUpdateStatus) return
    const cols = columns
    const targetIdx = direction === "left" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= cols.length) return

    const currentStatus = cols[index]
    const currentId = currentStatus.id

    if (currentId < 0) return // Skip fallback mock statuses

    let newPosition = 1000

    if (direction === "left") {
      const prevCol = cols[targetIdx]
      const prevPrevCol = cols[targetIdx - 1]
      const prevPos = prevCol.position
      const prevPrevPos = prevPrevCol ? prevPrevCol.position : 0
      newPosition = (prevPos + prevPrevPos) / 2
    } else {
      const nextCol = cols[targetIdx]
      const nextNextCol = cols[targetIdx + 1]
      const nextPos = nextCol.position
      const nextNextPos = nextNextCol
        ? nextNextCol.position
        : nextCol.position + 2000
      newPosition = (nextPos + nextNextPos) / 2
    }

    void onUpdateStatus(currentId, { position: newPosition })
  }

  const activeDragTask = React.useMemo(() => {
    if (!activeId || activeId.startsWith("column-")) return null
    return localTasks.find((t) => t.id.toString() === activeId) || null
  }, [activeId, localTasks])

  const activeDragColumn = React.useMemo(() => {
    if (!activeId || !activeId.startsWith("column-")) return null
    const colKey = activeId.replace("column-", "")
    return localColumns.find((c) => c.key === colKey) || null
  }, [activeId, localColumns])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="notion-board flex h-full min-w-full items-start gap-5 overflow-x-auto p-4">
        <SortableContext
          items={localColumns.map((col) => `column-${col.key}`)}
          strategy={horizontalListSortingStrategy}
        >
          {localColumns.map((col, index) => {
            const colTasks = localTasks.filter((t) => t.status === col.key)
            return (
              <SortableColumn
                key={col.key}
                id={col.key}
                label={col.name}
                color={col.color}
                count={colTasks.length}
                onAddTask={onAddTask ? () => onAddTask(col.key) : undefined}
                menu={
                  onUpdateStatus && onDeleteStatus ? (
                    <ColumnMenu
                      column={{
                        id: col.id,
                        key: col.key,
                        name: col.name,
                        color: col.color,
                      }}
                      onRename={(name) => onUpdateStatus(col.id, { name })}
                      onChangeColor={(color) =>
                        onUpdateStatus(col.id, { color })
                      }
                      onMoveLeft={() => handleMoveStatus(index, "left")}
                      onMoveRight={() => handleMoveStatus(index, "right")}
                      onDelete={() => onDeleteStatus(col.id)}
                    />
                  ) : undefined
                }
              >
                <SortableContext
                  items={colTasks.map((t) => t.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {colTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                    />
                  ))}
                </SortableContext>
              </SortableColumn>
            )
          })}
        </SortableContext>

        {/* Add status column button - only for active group chat */}
        {onCreateStatus && <AddColumnButton onCreate={onCreateStatus} />}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragTask ? (
              <div className="pointer-events-none z-[9999] w-[280px] select-none md:w-[300px]">
                <TaskCardContent task={activeDragTask} isOverlay={true} />
              </div>
            ) : activeDragColumn ? (
              (() => {
                const overlayTasks = localTasks.filter(
                  (t) => t.status === activeDragColumn.key
                )
                return (
                  <div className="notion-column notion-column--overlay flex w-[280px] flex-col gap-2 rounded-lg p-1.5 select-none md:w-[300px]">
                    {/* Column header (mirrors the real column) */}
                    <div className="notion-column-header flex h-8 items-center justify-between pr-1">
                      <div className="flex items-center gap-1 select-none">
                        <div className="shrink-0 rounded p-0.5 text-[var(--notion-text-tertiary)]">
                          <GripVertical className="size-3.5" />
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: `var(--notion-${activeDragColumn.color})`,
                          }}
                        >
                          {activeDragColumn.name}
                        </span>
                        <span className="ml-1.5 text-xs font-normal text-[var(--notion-text-tertiary)]">
                          {overlayTasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards (real cards, capped for performance) */}
                    <div className="flex flex-col gap-2">
                      {overlayTasks.slice(0, 6).map((task) => (
                        <TaskCardContent key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  )
}

interface TaskBoardProps {
  tasks: Task[]
  statuses: TaskStatus[]
  onSelectTask: (task: Task) => void
  onUpdateTaskStatus: (
    taskId: number,
    status: string,
    position?: number
  ) => void
  onAddTask?: (statusKey: string) => void
  onCreateStatus?: (name: string, color?: string) => Promise<void>
  onUpdateStatus?: (
    statusId: number,
    data: { name?: string; color?: string; position?: number }
  ) => Promise<void>
  onDeleteStatus?: (statusId: number) => Promise<void>
}
