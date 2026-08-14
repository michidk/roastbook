import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DateFormat } from '@/lib/app-settings'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Normalizes user-entered URLs by prepending "https://" when no scheme is
 * present (e.g. "www.example.com" -> "https://www.example.com"). Without
 * this, a scheme-less value fails native `<input type="url">` validation
 * silently (no error toast, no server request) and would otherwise render
 * as a broken relative link if saved as-is.
 */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || URL_SCHEME_PATTERN.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * Normalizes a string for case/whitespace-insensitive comparison, e.g. to
 * detect duplicate roaster names like "Bluebird Coffee Roastery" vs
 * "bluebird  coffee roastery ". Lowercases, trims, and collapses runs of
 * internal whitespace to a single space.
 */
export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Formats a date using an explicit day/month/year representation instead of
 * the locale-dependent, ambiguous output of `toLocaleDateString()` called
 * with no arguments (which can render as MM/DD/YYYY or DD/MM/YYYY depending
 * on the runtime locale, e.g. "8/9/2026").
 */
export function formatDate(
  value: Date | string | number,
  format: DateFormat = 'day-month-year-slash',
): string {
  const dateOnlyMatch =
    typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null
  const date = dateOnlyMatch ? null : new Date(value)
  const year = dateOnlyMatch?.[1] ?? String(date?.getFullYear())
  const month = dateOnlyMatch?.[2] ?? String((date?.getMonth() ?? 0) + 1)
  const day = dateOnlyMatch?.[3] ?? String(date?.getDate())
  const paddedMonth = month.padStart(2, '0')
  const paddedDay = day.padStart(2, '0')

  switch (format) {
    case 'month-day-year-slash':
      return `${paddedMonth}/${paddedDay}/${year}`
    case 'day-month-year-dot':
      return `${paddedDay}.${paddedMonth}.${year}`
    case 'year-month-day':
      return `${year}-${paddedMonth}-${paddedDay}`
    case 'day-month-year-slash':
      return `${paddedDay}/${paddedMonth}/${year}`
  }
}

export function formatDateTime(
  value: Date | string | number,
  format: DateFormat = 'day-month-year-slash',
): string {
  const time = new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${formatDate(value, format)}, ${time}`
}
