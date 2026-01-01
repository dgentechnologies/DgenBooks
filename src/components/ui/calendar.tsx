"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
}

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selected || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDateClick = (day: Date) => {
    if (disabled && disabled(day)) {
      return
    }
    if (onSelect) {
      onSelect(day)
    }
  }

  return (
    <div
      className={cn(
        "p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-700/50 rounded-xl shadow-2xl shadow-slate-950/50 w-full",
        className
      )}
    >
      {/* Header with navigation */}
      <div className="flex justify-center items-center relative mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="absolute left-0 h-9 w-9 bg-slate-800/50 p-0 opacity-70 hover:opacity-100 hover:bg-slate-700/70 border border-slate-600/50 rounded-md transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center"
          aria-label="Go to previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-base font-semibold text-white tracking-wide">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="absolute right-0 h-9 w-9 bg-slate-800/50 p-0 opacity-70 hover:opacity-100 hover:bg-slate-700/70 border border-slate-600/50 rounded-md transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center"
          aria-label="Go to next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Single grid for headers and days */}
      <div className="grid grid-cols-7 gap-1 w-full text-center">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-slate-400 text-sm font-medium py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selected && isSameDay(day, selected)
          const isTodayDate = isToday(day)
          const isDisabled = disabled && disabled(day)

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-10 p-0 font-medium rounded-lg transition-all duration-200 flex items-center justify-center",
                // Base styles
                isCurrentMonth
                  ? "text-slate-200 hover:bg-slate-700/50 hover:text-white hover:scale-105 hover:shadow-md"
                  : "text-slate-600 opacity-50 hover:opacity-70",
                // Selected state
                isSelected &&
                  "bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 font-semibold scale-105",
                // Today state
                !isSelected &&
                  isTodayDate &&
                  "bg-slate-800/60 text-blue-400 font-bold border-2 border-blue-500/50 shadow-lg shadow-blue-500/20",
                // Disabled state
                isDisabled &&
                  "text-slate-700 opacity-40 cursor-not-allowed hover:bg-transparent hover:scale-100"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
