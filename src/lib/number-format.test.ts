import { describe, expect, test } from 'bun:test'
import {
  formatNumber,
  formatNumberPlaceholder,
  normalizeNumberInput,
  stepNumberValue,
} from '@/lib/number-format'

describe('number formatting', () => {
  test('formats canonical values with the selected separators', () => {
    expect(formatNumber('1234.50', 'decimal-point', { grouping: true })).toBe(
      '1,234.50',
    )
    expect(formatNumber('1234.50', 'decimal-comma', { grouping: true })).toBe(
      '1.234,50',
    )
    expect(formatNumber('-0.25', 'decimal-comma')).toBe('-0,25')
    expect(
      formatNumber('1234.50', 'space-decimal-comma', { grouping: true }),
    ).toBe('1 234,50')
    expect(
      formatNumber('1234.50', 'apostrophe-decimal-point', {
        grouping: true,
      }),
    ).toBe('1’234.50')
  })

  test('accepts typed or pasted values from either layout', () => {
    expect(normalizeNumberInput('18,5')).toBe('18.5')
    expect(normalizeNumberInput('18.5')).toBe('18.5')
    expect(normalizeNumberInput('1.234,56')).toBe('1234.56')
    expect(normalizeNumberInput('1,234.56')).toBe('1234.56')
    expect(normalizeNumberInput('1’234,56')).toBe('1234.56')
    expect(normalizeNumberInput('12,')).toBe('12.')
    expect(normalizeNumberInput('coffee')).toBeNull()
  })

  test('localizes numeric placeholders', () => {
    expect(formatNumberPlaceholder('e.g., 18.50', 'decimal-comma')).toBe(
      'e.g., 18,50',
    )
  })

  test('steps precisely and respects bounds', () => {
    expect(stepNumberValue({ value: '18.2', step: 0.1, direction: 1 })).toBe(
      '18.3',
    )
    expect(
      stepNumberValue({ value: '0', step: 0.5, direction: -1, min: 0 }),
    ).toBe('0')
    expect(
      stepNumberValue({ value: '89.75', step: 0.5, direction: 1, max: 90 }),
    ).toBe('90')
  })
})
