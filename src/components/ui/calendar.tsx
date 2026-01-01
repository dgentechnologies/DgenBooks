"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-700/50 rounded-xl shadow-2xl shadow-slate-950/50",
        className
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-base font-semibold text-white tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-slate-800/50 p-0 opacity-70 hover:opacity-100 hover:bg-slate-700/70 border-slate-600/50 text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 mt-2",
        head_row: "flex w-full",
        head_cell:
          "text-slate-400 rounded-md font-semibold text-xs uppercase tracking-wider text-center flex-1 flex items-center justify-center",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center",
          "[&:has([aria-selected])]:bg-slate-800/40 [&:has([aria-selected])]:rounded-lg",
          "first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium text-slate-200 hover:bg-slate-700/50 hover:text-white rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 focus:from-blue-600 focus:to-blue-700 shadow-lg shadow-blue-500/30 font-semibold scale-105",
        day_today: "bg-slate-800/60 text-blue-400 font-bold border-2 border-blue-500/50 shadow-lg shadow-blue-500/20",
        day_outside:
          "day-outside text-slate-600 opacity-50 hover:opacity-70 aria-selected:bg-slate-800/30 aria-selected:text-slate-500",
        day_disabled: "text-slate-700 opacity-40 cursor-not-allowed hover:bg-transparent",
        day_range_middle:
          "aria-selected:bg-slate-800/40 aria-selected:text-slate-200 rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }: { 
          orientation?: 'left' | 'right' | 'up' | 'down'; 
          className?: string;
          size?: number;
          disabled?: boolean;
        }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-5 w-5 transition-transform")} {...props} />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
