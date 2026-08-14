function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export const FUTURE_DATE_TOLERANCE_MS = 5 * 60 * 1000

export function toLocalDateTimeInput(value: Date | string | number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localDateTimeInputToDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isDateTooFarInFuture(value: Date, now = new Date()): boolean {
  return value.getTime() > now.getTime() + FUTURE_DATE_TOLERANCE_MS
}
