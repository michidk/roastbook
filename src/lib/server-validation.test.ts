import { describe, expect, test } from 'bun:test'
import {
  boundedDecimalStringSchema,
  currencySchema,
  imageBase64Schema,
  imageFilenameSchema,
  notFutureDateSchema,
  positiveIdSchema,
  shotCreateSchema,
  tasteTagCreateSchema,
} from '@/lib/server-validation'

describe('server validation schemas', () => {
  test('accepts positive IDs only', () => {
    expect(positiveIdSchema.parse(1)).toBe(1)
    expect(() => positiveIdSchema.parse(0)).toThrow()
    expect(() => positiveIdSchema.parse(1.5)).toThrow()
    expect(() => positiveIdSchema.parse('1')).toThrow()
  })

  test('constrains decimal values and currencies', () => {
    expect(boundedDecimalStringSchema(100, 2).parse('99.50')).toBe('99.50')
    expect(() => boundedDecimalStringSchema(100, 2).parse('100.001')).toThrow()
    expect(() => boundedDecimalStringSchema(100, 2).parse('-1')).toThrow()
    expect(currencySchema.parse('EUR')).toBe('EUR')
    expect(() => currencySchema.parse('BTC')).toThrow()
  })

  test('rejects filenames with path components', () => {
    expect(imageFilenameSchema.parse('bag-front.jpg')).toBe('bag-front.jpg')
    expect(() => imageFilenameSchema.parse('../secret')).toThrow()
    expect(() => imageFilenameSchema.parse('nested/file.jpg')).toThrow()
  })

  test('rejects malformed and oversized image payloads', () => {
    expect(imageBase64Schema.parse('AQID')).toBe('AQID')
    expect(() => imageBase64Schema.parse('not base64')).toThrow()
    expect(() => imageBase64Schema.parse('AAA')).toThrow()
    expect(() => imageBase64Schema.parse('A'.repeat(14_000_000))).toThrow()
  })

  test('validates complete shot payloads at runtime', () => {
    const valid = shotCreateSchema.parse({
      recipeId: 4,
      brewingMethodId: 1,
      doseGrams: '18.00',
      ratioBasis: 'target_yield',
      rating: 5,
      accessoryGearIds: [2, 3],
    })
    expect(valid.brewingMethodId).toBe(1)
    expect(valid.recipeId).toBe(4)
    expect(() =>
      shotCreateSchema.parse({ brewingMethodId: -1, rating: 6 }),
    ).toThrow()
    expect(() =>
      shotCreateSchema.parse({
        brewingMethodId: 1,
        ratioBasis: 'client-invented-value',
      }),
    ).toThrow()
  })

  test('rejects dates meaningfully in the future', () => {
    expect(notFutureDateSchema.parse(new Date())).toBeInstanceOf(Date)
    expect(() =>
      notFutureDateSchema.parse(new Date(Date.now() + 10 * 60 * 1000)),
    ).toThrow('Date cannot be more than five minutes in the future')
    expect(() =>
      shotCreateSchema.parse({
        brewingMethodId: 1,
        brewedAt: new Date(Date.now() + 10 * 60 * 1000),
      }),
    ).toThrow()
  })

  test('requires a label and LLM instruction for custom taste tags', () => {
    expect(
      tasteTagCreateSchema.parse({
        name: '  Jammy  ',
        llmInstruction: '  Treat this as a strong fruit note.  ',
      }),
    ).toEqual({
      name: 'Jammy',
      llmInstruction: 'Treat this as a strong fruit note.',
    })
    expect(() =>
      tasteTagCreateSchema.parse({ name: 'Jammy', llmInstruction: '' }),
    ).toThrow()
  })
})
