import * as React from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/shared/lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface DatePickerProps {
  value?: string // YYYY-MM-DD or ISO string
  onChange: (date: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)

  // Parse the current selected date
  const selectedDate = React.useMemo(() => {
    if (!value) return null
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }, [value])

  // Track the month/year view of the calendar
  const [viewDate, setViewDate] = React.useState(() => selectedDate || new Date())

  // Keep viewDate in sync when selectedDate changes and picker opens
  React.useEffect(() => {
    if (open && selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewDate(selectedDate)
    }
  }, [open, selectedDate])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day)
    // Format as YYYY-MM-DD
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, "0")
    const d = String(newDate.getDate()).padStart(2, "0")
    onChange(`${y}-${m}-${d}`)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  // Calendar math
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon ...
  const prevMonthDays = new Date(year, month, 0).getDate()

  // Grid cells (always 42 to make a consistent 6-row calendar)
  const cells: Array<{ day: number; isCurrentMonth: boolean; key: string }> = []

  // Prev month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({
      day: prevMonthDays - firstDayOfMonth + i + 1,
      isCurrentMonth: false,
      key: `prev-${i}`,
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      isCurrentMonth: true,
      key: `curr-${i}`,
    })
  }

  // Next month padding
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      day: i,
      isCurrentMonth: false,
      key: `next-${i}`,
    })
  }

  const daysOfWeek = [
    t("calendar.sunShort", "CN"),
    t("calendar.monShort", "T2"),
    t("calendar.tueShort", "T3"),
    t("calendar.wedShort", "T4"),
    t("calendar.thuShort", "T5"),
    t("calendar.friShort", "T6"),
    t("calendar.satShort", "T7"),
  ]

  const monthYearLabel = viewDate.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })

  const isToday = (day: number, isCurr: boolean) => {
    if (!isCurr) return false
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const isSelected = (day: number, isCurr: boolean) => {
    if (!isCurr || !selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left transition-all hover:bg-muted/50 cursor-pointer outline-none focus:border-ring focus:ring-2 focus:ring-ring disabled:opacity-50 select-none",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedDate
                ? selectedDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : placeholder || t("calendar.selectDate", "Chọn ngày...")}
            </span>
          </div>
          {selectedDate && !disabled && (
            <span
              onClick={handleClear}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground transition-all cursor-pointer"
            >
              <XIcon className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3 flex flex-col gap-3 select-none">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all outline-none"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="text-xs font-semibold text-foreground capitalize font-sans">
            {monthYearLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex size-7 items-center justify-center rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all outline-none"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center font-sans">
          {/* Days of week */}
          {daysOfWeek.map((day) => (
            <span
              key={day}
              className="text-[10px] font-bold text-muted-foreground uppercase"
            >
              {day}
            </span>
          ))}

          {/* Days cells */}
          {cells.map((cell) => {
            const curr = cell.isCurrentMonth
            const selected = isSelected(cell.day, curr)
            const today = isToday(cell.day, curr)

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => curr && handleSelectDay(cell.day)}
                disabled={!curr}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-xs font-medium transition-all cursor-pointer outline-none relative",
                  !curr && "text-muted-foreground/35 cursor-default hover:bg-transparent pointer-events-none",
                  curr && !selected && !today && "hover:bg-muted text-foreground",
                  today && !selected && "bg-accent/40 text-accent-foreground font-bold border border-primary/25",
                  selected && "bg-primary text-primary-foreground font-semibold shadow-xs"
                )}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
