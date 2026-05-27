import * as React from "react"
import { createPortal } from "react-dom"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CalendarIcon, MessageSquareIcon, PlusIcon, TagIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { Task } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Badge } from "@/shared/ui/badge"
import { formatEstimate } from "@/shared/lib/time-estimate-utils"

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, "")
}

// Notion card: warm cream surface, minimal border, content-first
function TaskCardContent({ task, isDragging, isOverlay }: TaskCardContentProps) {
  const { t } = useTranslation()

  const isOverdue = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr || status === "completed") return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dueDateStr) < today
  }

  const totalSubtasks = task.subtasks?.length ?? 0
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length ?? 0
  const cardOverdue = isOverdue(task.dueDate, task.status)

  const priorityLabels: Record<string, string> = {
    high: t("tasks.priorityHigh", "Cao"),
    medium: t("tasks.priorityMedium", "Trung bình"),
    low: t("tasks.priorityLow", "Thấp"),
  }

  const priorityColors: Record<string, string> = {
    high: "red",
    medium: "orange",
    low: "blue",
  }

  const assignees = task.members?.filter((m) => m.role === "assignee") || []

  return (
    <div
      className={cn(
        "notion-card group relative flex flex-col gap-2 transition-all select-none",
        isOverlay && "notion-card--dragging",
        isDragging && !isOverlay && "opacity-30 border-dashed bg-[var(--notion-muted)]"
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
          <span className={cn(
            "w-1 h-1 rounded-full",
            task.priority === "high" && "bg-[var(--notion-red)]",
            task.priority === "medium" && "bg-[var(--notion-orange)]",
            task.priority === "low" && "bg-[var(--notion-blue)]"
          )} />
          {priorityLabels[task.priority]}
        </Badge>
      )}

      {/* Title */}
      <h4 className={cn(
        "text-sm font-medium text-[var(--notion-text)] leading-snug pr-1",
        !isDragging && !isOverlay && "group-hover:text-[var(--notion-text-hover)]"
      )}>
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
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                cardOverdue && "text-[var(--notion-red)] font-medium"
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
            <AvatarFallback className="text-[9px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
              {assignees[0].user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : task.assignee ? (
          <Avatar className="h-5 w-5" title={task.assignee.displayName}>
            <AvatarImage src={task.assignee.avatar ?? undefined} />
            <AvatarFallback className="text-[9px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)]">
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

function DraggableTaskCard({ task, onSelectTask }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id.toString(),
  })

  const handleClick = () => {
    if (isDragging) return
    onSelectTask(task)
  }

  return (
    <div
      ref={setNodeRef}
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

function DroppableColumn({ id, label, count, children, onAddTask }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const { t } = useTranslation()

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "notion-column flex flex-col gap-2 p-1.5 rounded-lg transition-all duration-200 min-h-[380px]",
        isOver && "bg-[var(--notion-muted)]"
      )}
    >
      {/* Column header */}
      <div className="notion-column-header">
        <div className="flex items-center gap-2">
          <span className={cn("notion-status-badge", `notion-status-badge--${id}`)}>
            {label}
          </span>
          <span className="text-xs font-normal text-[var(--notion-text-tertiary)]">
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5 min-h-[100px]">
        {children}
      </div>

      {/* Quick Add Button */}
      {onAddTask && (
        <button
          type="button"
          onClick={onAddTask}
          className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 text-xs text-[var(--notion-text-tertiary)] hover:text-[var(--notion-text-secondary)] hover:bg-[var(--notion-muted)] rounded transition-colors mt-1 select-none"
        >
          <PlusIcon className="size-3.5" />
          <span>{t("tasks.new", "Mới")}</span>
        </button>
      )}
    </div>
  )
}

interface DroppableColumnProps {
  id: "todo" | "in_progress" | "completed"
  label: string
  count: number
  children: React.ReactNode
  onAddTask?: () => void
}

export function TaskBoard({ tasks, onSelectTask, onUpdateTaskStatus, onAddTask }: TaskBoardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString())
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = Number(active.id)
    const targetStatus = over.id as "todo" | "in_progress" | "completed"
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== targetStatus) {
      onUpdateTaskStatus(taskId, targetStatus)
    }
  }

  const handleDragCancel = () => setActiveId(null)

  const columns: Array<{ id: "todo" | "in_progress" | "completed"; label: string }> = [
    { id: "todo", label: t("tasks.statusTodo", "Cần làm") },
    { id: "in_progress", label: t("tasks.statusInProgress", "Đang làm") },
    { id: "completed", label: t("tasks.statusCompleted", "Hoàn thành") },
  ]

  const activeDragTask = React.useMemo(() => {
    if (!activeId) return null
    return tasks.find((t) => t.id.toString() === activeId) || null
  }, [activeId, tasks])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="notion-board grid h-full grid-cols-1 gap-5 overflow-x-auto p-4 md:grid-cols-3 min-w-[680px]">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <DroppableColumn
              key={col.id}
              id={col.id}
              label={col.label}
              count={colTasks.length}
              onAddTask={onAddTask ? () => onAddTask(col.id) : undefined}
            >
              {colTasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                />
              ))}
            </DroppableColumn>
          )
        })}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDragTask ? (
              <div className="w-[280px] md:w-[300px] pointer-events-none select-none z-[9999]">
                <TaskCardContent task={activeDragTask} isOverlay={true} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  )
}

interface TaskBoardProps {
  tasks: Task[]
  onSelectTask: (task: Task) => void
  onUpdateTaskStatus: (taskId: number, status: "todo" | "in_progress" | "completed") => void
  onAddTask?: (status: "todo" | "in_progress" | "completed") => void
}