import { CURRENCIES } from '@/lib/constants'

export type Currency = (typeof CURRENCIES)[number]['value']

export const NUMBER_FORMAT_OPTIONS = [
  {
    value: 'decimal-point',
    label: '1,234.56',
    description: 'Period for decimals, comma for thousands',
  },
  {
    value: 'decimal-comma',
    label: '1.234,56',
    description: 'Comma for decimals, period for thousands',
  },
  {
    value: 'space-decimal-point',
    label: '1 234.56',
    description: 'Period for decimals, space for thousands',
  },
  {
    value: 'space-decimal-comma',
    label: '1 234,56',
    description: 'Comma for decimals, space for thousands',
  },
  {
    value: 'apostrophe-decimal-point',
    label: '1’234.56',
    description: 'Period for decimals, apostrophe for thousands',
  },
  {
    value: 'apostrophe-decimal-comma',
    label: '1’234,56',
    description: 'Comma for decimals, apostrophe for thousands',
  },
] as const

export type NumberFormat = (typeof NUMBER_FORMAT_OPTIONS)[number]['value']

export const DATE_FORMAT_OPTIONS = [
  { value: 'day-month-year-slash', label: '31/12/2026' },
  { value: 'month-day-year-slash', label: '12/31/2026' },
  { value: 'day-month-year-dot', label: '31.12.2026' },
  { value: 'year-month-day', label: '2026-12-31' },
] as const

export type DateFormat = (typeof DATE_FORMAT_OPTIONS)[number]['value']

export type DefaultMapLocation = {
  readonly latitude: number
  readonly longitude: number
  readonly label: string
}

export type AppSettings = {
  readonly defaultCurrency: Currency
  readonly dateFormat: DateFormat
  readonly defaultMapLocation: DefaultMapLocation | null
  readonly numberFormat: NumberFormat
}

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.some((currency) => currency.value === value)
}

export function isDateFormat(value: unknown): value is DateFormat {
  return DATE_FORMAT_OPTIONS.some((format) => format.value === value)
}

export function isNumberFormat(value: unknown): value is NumberFormat {
  return NUMBER_FORMAT_OPTIONS.some((format) => format.value === value)
}
