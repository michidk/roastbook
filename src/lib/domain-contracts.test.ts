import { describe, expect, test } from 'bun:test'
import { CURRENCIES, GEAR_TYPES } from '@/lib/constants'
import {
  CURRENCY_VALUES,
  GEAR_TYPE_VALUES,
  IMAGE_MIME_TYPE_VALUES,
} from '@/lib/domain-contracts'
import { currencySchema, imageMimeTypeSchema } from '@/lib/server-validation'

describe('shared domain contracts', () => {
  test('keeps UI options and runtime schemas on the same values', () => {
    expect(CURRENCIES.map(({ value }) => value)).toEqual([...CURRENCY_VALUES])
    expect(GEAR_TYPES.map(({ value }) => value)).toEqual([...GEAR_TYPE_VALUES])

    for (const currency of CURRENCY_VALUES) {
      expect(currencySchema.parse(currency)).toBe(currency)
    }
    for (const mimeType of IMAGE_MIME_TYPE_VALUES) {
      expect(imageMimeTypeSchema.parse(mimeType)).toBe(mimeType)
    }
  })

  test('rejects values outside the shared contracts', () => {
    expect(currencySchema.safeParse('BTC').success).toBe(false)
    expect(imageMimeTypeSchema.safeParse('image/svg+xml').success).toBe(false)
  })
})
