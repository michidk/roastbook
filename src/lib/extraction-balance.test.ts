import { describe, expect, test } from 'bun:test'
import {
  EXTRACTION_BALANCE_BALANCED,
  EXTRACTION_BALANCE_LEVELS,
  extractionBalanceLabel,
  hasExtractionBalance,
  isExtractionBalance,
} from '@/lib/extraction-balance'

describe('isExtractionBalance', () => {
  test('accepts the five stored levels', () => {
    for (const level of EXTRACTION_BALANCE_LEVELS) {
      expect(isExtractionBalance(level)).toBe(true)
    }
  })

  test('rejects the not-recorded sentinel and out-of-range values', () => {
    expect(isExtractionBalance(0)).toBe(false)
    expect(isExtractionBalance(6)).toBe(false)
    expect(isExtractionBalance(2.5)).toBe(false)
    expect(isExtractionBalance(null)).toBe(false)
    expect(isExtractionBalance('3')).toBe(false)
  })
})

describe('extractionBalanceLabel', () => {
  test('runs from sour through balanced to bitter', () => {
    expect(extractionBalanceLabel(1)).toBe('Very sour')
    expect(extractionBalanceLabel(EXTRACTION_BALANCE_BALANCED)).toBe('Balanced')
    expect(extractionBalanceLabel(5)).toBe('Very bitter')
  })

  test('labels the midpoint of the scale as balanced', () => {
    expect(EXTRACTION_BALANCE_BALANCED).toBe(
      (EXTRACTION_BALANCE_LEVELS.length + 1) / 2,
    )
  })

  test('returns null when nothing is recorded', () => {
    expect(extractionBalanceLabel(0)).toBeNull()
    expect(extractionBalanceLabel(null)).toBeNull()
    expect(extractionBalanceLabel(undefined)).toBeNull()
  })
})

describe('hasExtractionBalance', () => {
  test('treats only a stored level as recorded', () => {
    expect(hasExtractionBalance(3)).toBe(true)
    expect(hasExtractionBalance(0)).toBe(false)
    expect(hasExtractionBalance(null)).toBe(false)
  })
})
