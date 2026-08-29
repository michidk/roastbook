import type { NumberFormat } from '@/lib/app-settings'
import { formatNumber } from '@/lib/number-format'

const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
}

function usesTrailingCurrencySymbol(format: NumberFormat) {
  return format.endsWith('decimal-comma')
}

export function getCurrencyAffix(currency: string, numberFormat: NumberFormat) {
  return {
    unit: CURRENCY_SYMBOLS[currency] ?? currency,
    unitPosition: usesTrailingCurrencySymbol(numberFormat)
      ? ('suffix' as const)
      : ('prefix' as const),
  }
}

/** Format money with a symbol placed consistently with the selected number layout. */
export function formatCurrency(
  value: number | string,
  currency: string,
  numberFormat: NumberFormat,
) {
  const amount = formatNumber(value, numberFormat, { grouping: true })
  const { unit: symbol, unitPosition } = getCurrencyAffix(
    currency,
    numberFormat,
  )

  if (unitPosition === 'suffix') {
    return `${amount}\u00a0${symbol}`
  }

  const sign = amount.startsWith('-') ? '-' : ''
  const unsignedAmount = sign ? amount.slice(1) : amount
  const spacing = symbol === 'CHF' ? '\u00a0' : ''
  return `${sign}${symbol}${spacing}${unsignedAmount}`
}
