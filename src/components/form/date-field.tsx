'use client'

import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { describedBy, FieldShell } from '@/components/form/form-field'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAppSettings } from '@/hooks/use-app-settings'
import {
  localDateInputToDate,
  localDateTimeInputToDate,
  pad,
  toLocalDateInput,
} from '@/lib/date-input'
import { cn, formatDate } from '@/lib/utils'

const TRIGGER_CLASS_NAME =
  'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card/75 px-3 py-1 text-left text-base shadow-[inset_0_1px_0_color-mix(in_srgb,var(--card)_75%,white),var(--control-shadow)] outline-none transition-[color,background-color,border-color,box-shadow] duration-150 hover:bg-secondary/70 focus-visible:border-ring focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm [@media(hover:hover)_and_(pointer:fine)]:h-9'

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

interface DateFieldBaseProps {
  label: string
  id: string
  required?: boolean
  className?: string
  disabled?: boolean
  error?: string
  placeholder?: string
  autoFocus?: boolean
}

interface DateFieldProps extends DateFieldBaseProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}

export function DateField({
  label,
  id,
  required,
  className,
  disabled,
  error,
  placeholder = 'Select date',
  value,
  onChange,
  min,
  max,
  autoFocus,
}: DateFieldProps) {
  const { dateFormat } = useAppSettings()
  const [open, setOpen] = useState(false)
  const selectedDate = localDateInputToDate(value)
  const minDate = min ? localDateInputToDate(min) : null
  const maxDate = max ? localDateInputToDate(max) : null

  return (
    <FieldShell
      label={label}
      id={id}
      required={required}
      className={className}
      error={error}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error)}
          className={TRIGGER_CLASS_NAME}
        >
          <span className={cn(!selectedDate && 'text-muted-foreground')}>
            {selectedDate ? formatDate(selectedDate, dateFormat) : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={selectedDate}
            onSelect={(date) => {
              onChange(toLocalDateInput(date))
              setOpen(false)
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
        </PopoverContent>
      </Popover>
    </FieldShell>
  )
}

interface DateTimeFieldProps extends DateFieldBaseProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}

export function DateTimeField({
  label,
  id,
  required,
  className,
  disabled,
  error,
  placeholder = 'Select date and time',
  value,
  onChange,
  min,
  max,
  autoFocus,
}: DateTimeFieldProps) {
  const { dateFormat } = useAppSettings()
  const [open, setOpen] = useState(false)
  const selectedDate = localDateTimeInputToDate(value)
  const [datePart = '', timePart = ''] = value ? value.split('T') : ['', '']
  const hour = timePart ? Number(timePart.slice(0, 2)) : 0
  const minute = timePart ? Number(timePart.slice(3, 5)) : 0
  const minDate = min ? localDateTimeInputToDate(min) : null
  const maxDate = max ? localDateTimeInputToDate(max) : null

  const commit = (
    nextDatePart: string,
    nextHour: number,
    nextMinute: number,
  ) => {
    if (!nextDatePart) return
    onChange(
      `${nextDatePart}T${pad(clamp(nextHour, 0, 23))}:${pad(clamp(nextMinute, 0, 59))}`,
    )
  }

  return (
    <FieldShell
      label={label}
      id={id}
      required={required}
      className={className}
      error={error}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error)}
          className={TRIGGER_CLASS_NAME}
        >
          <span className={cn(!selectedDate && 'text-muted-foreground')}>
            {selectedDate
              ? `${formatDate(selectedDate, dateFormat)}, ${pad(hour)}:${pad(minute)}`
              : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            selected={localDateInputToDate(datePart)}
            onSelect={(date) => {
              commit(toLocalDateInput(date), hour, minute)
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
          <div className="mt-3 flex items-center justify-center gap-2 border-t border-border pt-3">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              value={hour}
              disabled={!datePart}
              onChange={(e) => commit(datePart, Number(e.target.value), minute)}
              aria-label="Hour"
              className="h-9 w-14 rounded-lg border border-input bg-card/75 text-center text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
            />
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={minute}
              disabled={!datePart}
              onChange={(e) => commit(datePart, hour, Number(e.target.value))}
              aria-label="Minute"
              className="h-9 w-14 rounded-lg border border-input bg-card/75 text-center text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
            />
          </div>
        </PopoverContent>
      </Popover>
    </FieldShell>
  )
}
