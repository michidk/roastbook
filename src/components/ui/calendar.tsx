'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
})

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function isSameDay(a: Date, b: Date): boolean {
  return dateOnly(a).getTime() === dateOnly(b).getTime()
}

function buildGridDays(month: Date): Date[] {
  const first = startOfMonth(month)
  const firstWeekday = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - firstWeekday)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
}

type CalendarProps = {
  readonly selected: Date | null
  readonly onSelect: (date: Date) => void
  readonly minDate?: Date | null
  readonly maxDate?: Date | null
  readonly className?: string
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
  const today = new Date()
  const minBound = minDate ? dateOnly(minDate).getTime() : null
  const maxBound = maxDate ? dateOnly(maxDate).getTime() : null

  const isDisabled = (day: Date) => {
    const time = dateOnly(day).getTime()
    if (minBound !== null && time < minBound) return true
    if (maxBound !== null && time > maxBound) return true
    return false
  }

  return (
    <div className={cn('w-64', className)}>
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setMonth((current) => addMonths(current, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium">
          {MONTH_FORMATTER.format(month)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setMonth((current) => addMonths(current, 1))}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {buildGridDays(month).map((day) => {
          const outsideMonth = day.getMonth() !== month.getMonth()
          const isSelected = selected ? isSameDay(day, selected) : false
          const isToday = isSameDay(day, today)
          const disabled = isDisabled(day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                'm-0.5 flex size-8 items-center justify-center rounded-full text-sm transition-colors',
                outsideMonth && 'text-muted-foreground/50',
                isToday && !isSelected && 'border border-ring/50',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary',
                !isSelected && !disabled && 'hover:bg-secondary',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
