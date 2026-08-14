import type { NumberFormat } from '@/lib/app-settings'

function separators(format: NumberFormat) {
  switch (format) {
    case 'decimal-comma':
      return { decimal: ',', thousands: '.' }
    case 'space-decimal-point':
      return { decimal: '.', thousands: ' ' }
    case 'space-decimal-comma':
      return { decimal: ',', thousands: ' ' }
    case 'apostrophe-decimal-point':
      return { decimal: '.', thousands: '’' }
    case 'apostrophe-decimal-comma':
      return { decimal: ',', thousands: '’' }
    case 'decimal-point':
      return { decimal: '.', thousands: ',' }
  }
}

/** Format a canonical dot-decimal value without changing its precision. */
export function formatNumber(
  value: number | string,
  format: NumberFormat,
  options: { grouping?: boolean } = {},
) {
  const canonical = String(value)
  const match = canonical.match(/^(-?)(\d+)(?:\.(\d*))?$/)
  if (!match) return canonical

  const sign = match[1] ?? ''
  const rawInteger = match[2]
  const fraction = match[3]
  if (!rawInteger) return canonical
  const { decimal, thousands } = separators(format)
  const integer = options.grouping
    ? rawInteger.replace(/\B(?=(\d{3})+(?!\d))/g, thousands)
    : rawInteger

  return `${sign}${integer}${fraction === undefined ? '' : `${decimal}${fraction}`}`
}

/**
 * Convert user-entered localized text into the canonical dot-decimal form used
 * by forms, validation, and PostgreSQL. The last separator is treated as the
 * decimal separator, making pasted values from either number layout work.
 */
export function normalizeNumberInput(value: string): string | null {
  const compact = value
    .trim()
    .replaceAll('−', '-')
    .replace(/[\s'’]/g, '')
  if (compact === '' || compact === '-') return compact
  if (!/^-?[\d.,]+$/.test(compact)) return null

  const negative = compact.startsWith('-')
  const unsigned = negative ? compact.slice(1) : compact
  const separatorIndex = Math.max(
    unsigned.lastIndexOf('.'),
    unsigned.lastIndexOf(','),
  )
  const integerDigits = (
    separatorIndex < 0 ? unsigned : unsigned.slice(0, separatorIndex)
  ).replace(/[.,]/g, '')
  const fractionDigits =
    separatorIndex < 0
      ? undefined
      : unsigned.slice(separatorIndex + 1).replace(/[.,]/g, '')

  if (!integerDigits && !fractionDigits) return null
  const integer = integerDigits || '0'
  return `${negative ? '-' : ''}${integer}${
    fractionDigits === undefined ? '' : `.${fractionDigits}`
  }`
}

export function formatNumberPlaceholder(
  placeholder: string | undefined,
  format: NumberFormat,
) {
  if (!placeholder) return placeholder
  return placeholder.replace(/-?\d+(?:[.,]\d+)?/g, (value) => {
    const canonical = normalizeNumberInput(value)
    return canonical === null ? value : formatNumber(canonical, format)
  })
}

export function stepNumberValue({
  value,
  step,
  direction,
  min,
  max,
}: {
  value: string
  step: number
  direction: -1 | 1
  min?: number
  max?: number
}) {
  const current = Number(value || 0)
  const safeCurrent = Number.isFinite(current) ? current : 0
  const decimalPlaces = Math.min(
    10,
    Math.max(
      countDecimalPlaces(safeCurrent),
      countDecimalPlaces(step),
      countDecimalPlaces(min),
      countDecimalPlaces(max),
    ),
  )
  const scale = 10 ** decimalPlaces
  let next = Math.round((safeCurrent + direction * step) * scale) / scale
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return String(next)
}

function countDecimalPlaces(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 0
  const stringValue = String(value)
  if (stringValue.includes('e-')) {
    return Number(stringValue.split('e-')[1] ?? 0)
  }
  return stringValue.split('.')[1]?.length ?? 0
}
