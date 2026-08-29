import { describe, expect, test } from 'bun:test'
import { formatCurrency, getCurrencyAffix } from '@/lib/currency-format'

describe('currency formatting', () => {
  test('uses currency symbols instead of ISO codes', () => {
    expect(formatCurrency('4.81', 'EUR', 'decimal-point')).toBe('€4.81')
    expect(formatCurrency('4.81', 'USD', 'decimal-point')).toBe('$4.81')
    expect(formatCurrency('4.81', 'GBP', 'decimal-point')).toBe('£4.81')
    expect(formatCurrency('4.81', 'CHF', 'decimal-point')).toBe('CHF 4.81')
  })

  test('places symbols after decimal-comma amounts', () => {
    expect(formatCurrency('1234.50', 'EUR', 'decimal-comma')).toBe('1.234,50 €')
    expect(formatCurrency('-4.81', 'USD', 'space-decimal-comma')).toBe(
      '-4,81 $',
    )
  })

  test('keeps the minus sign before a leading currency symbol', () => {
    expect(formatCurrency('-4.81', 'EUR', 'decimal-point')).toBe('-€4.81')
  })

  test('exposes the matching inline input affix', () => {
    expect(getCurrencyAffix('EUR', 'decimal-point')).toEqual({
      unit: '€',
      unitPosition: 'prefix',
    })
    expect(getCurrencyAffix('CHF', 'space-decimal-comma')).toEqual({
      unit: 'CHF',
      unitPosition: 'suffix',
    })
  })
})
