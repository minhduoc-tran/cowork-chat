import * as React from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { Task } from "@/shared/api"
import { cn } from "@/shared/lib/utils"

interface TaskCalendarProps {
  tasks: Task[]
  onSelectTask: (task: Task) => void
  onAddTask: (dueDateStr: string) => void
  onUpdateTaskDueDate?: (
    taskId: number,
    dueDate: string | null
  ) => Promise<void>
}

export function TaskCalendar({
  tasks,
  onSelectTask,
  onAddTask,
  onUpdateTaskDueDate,
}: TaskCalendarProps) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = React.useState(() => new Date())
  const [dragOverDateKey, setDragOverDateKey] = React.useState<string | null>(
    null
  )

  // Navigation
  const prevMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Monthly calendar grid calculation (Monday - Sunday)
  const calendarDays = React.useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0)

    // Day of the week for 1st day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    let startDayOfWeek = startOfMonth.getDay()
    // Adjust start day: Mon (0), Tue (1), ..., Sun (6)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

    const daysInMonth = endOfMonth.getDate()

    const days: { date: Date; isCurrentMonth: boolean; key: string }[] = []

    // Previous month overflow days
    const prevMonthEnd = new Date(year, month, 0)
    const prevMonthDays = prevMonthEnd.getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i)
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${prevMonthDays - i}`,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      days.push({
        date: d,
        isCurrentMonth: true,
        key: `current-${i}`,
      })
    }

    // Next month overflow days (fill grid to make exactly 42 cells/6 rows)
    const remainingCells = 42 - days.length
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i)
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`,
      })
    }

    return days
  }, [currentDate])

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const formatMonthTitle = (date: Date) => {
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return t("tasks.calendarMonthTitle", {
      month,
      year,
      defaultValue: `Tháng ${month} năm ${year}`,
    })
  }

  // Week day headers
  const weekDays = [
    t("tasks.calendarMon", "T2"),
    t("tasks.calendarTue", "T3"),
    t("tasks.calendarWed", "T4"),
    t("tasks.calendarThu", "T5"),
    t("tasks.calendarFri", "T6"),
    t("tasks.calendarSat", "T7"),
    t("tasks.calendarSun", "CN"),
  ]

  const priorityDot: Record<string, string> = {
    high: "var(--notion-red)",
    medium: "var(--notion-orange)",
    low: "var(--notion-blue)",
  }

  return (
    <div className="notion-calendar select-none">
      {/* Calendar Header */}
      <div className="notion-calendar-header">
        <div className="notion-calendar-title">
          {formatMonthTitle(currentDate)}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="notion-icon-btn"
            title={t("tasks.calendarPrev", "Tháng trước")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="notion-btn-secondary h-7 px-2.5 text-xs font-medium"
          >
            {t("tasks.calendarToday", "Hôm nay")}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="notion-icon-btn"
            title={t("tasks.calendarNext", "Tháng sau")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="notion-calendar-grid">
        {/* Day headers: Mon - Sun */}
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              "notion-calendar-day-header",
              idx >= 5 && "notion-calendar-day-header--weekend"
            )}
          >
            {day}
          </div>
        ))}

        {/* Days grid cells */}
        {calendarDays.map(({ date, isCurrentMonth, key }) => {
          const dateTasks = getTasksForDate(date)
          const today = isToday(date)
          const isDragOver = dragOverDateKey === key
          const weekendDay = date.getDay() === 0 || date.getDay() === 6

          // Format ISO date local string (YYYY-MM-DD) for pre-filling
          const yearStr = date.getFullYear()
          const monthStr = String(date.getMonth() + 1).padStart(2, "0")
          const dayStr = String(date.getDate()).padStart(2, "0")
          const formattedDate = `${yearStr}-${monthStr}-${dayStr}`

          return (
            <div
              key={key}
              className={cn(
                "notion-calendar-cell",
                !isCurrentMonth && "notion-calendar-cell--outer",
                weekendDay && isCurrentMonth && "notion-calendar-cell--weekend",
                today && "notion-calendar-cell--today",
                isDragOver && "notion-calendar-cell--drag-over"
              )}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDragEnter={() => {
                setDragOverDateKey(key)
              }}
              onDragLeave={() => {
                if (dragOverDateKey === key) {
                  setDragOverDateKey(null)
                }
              }}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverDateKey(null)
                const taskIdStr = e.dataTransfer.getData("text/plain")
                if (taskIdStr && onUpdateTaskDueDate) {
                  const taskId = Number(taskIdStr)
                  const isoString = new Date(formattedDate).toISOString()
                  await onUpdateTaskDueDate(taskId, isoString)
                }
              }}
            >
              {/* Cell Header */}
              <div className="notion-calendar-cell-header">
                <span
                  className={cn(
                    "notion-calendar-day-num",
                    today && "notion-calendar-day-num--today"
                  )}
                >
                  {date.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onAddTask(formattedDate)}
                  className="notion-calendar-add-btn"
                  title={t("tasks.addTaskOnDay", "Thêm công việc cho ngày này")}
                >
                  <Plus className="size-3" />
                </button>
              </div>

              {/* Cell Tasks List */}
              <div className="notion-calendar-tasks">
                {dateTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id.toString())
                    }}
                    onClick={() => onSelectTask(task)}
                    className={cn(
                      "notion-calendar-task-badge",
                      task.status === "completed" &&
                        "notion-calendar-task-badge--completed"
                    )}
                    title={task.title}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: priorityDot[task.priority] }}
                    />
                    <span className="notion-calendar-task-badge-title">
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
