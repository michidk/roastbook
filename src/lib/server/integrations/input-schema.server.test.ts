import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  IntegrationInputError,
  integrationInput,
  reviveDates,
  toInputJsonSchema,
} from './input-schema.server'

const schema = z.object({
  brewedAt: z.date().optional(),
  roastDate: z.date().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({ at: z.date() })).optional(),
  either: z.union([z.number(), z.object({ at: z.date() })]).optional(),
})

describe('integration input schemas', () => {
  test('revives ISO strings only where the schema expects a date', () => {
    const value = reviveDates(schema, {
      brewedAt: '2026-01-02T03:04:05.000Z',
      roastDate: null,
      notes: '2026-01-02T03:04:05.000Z',
      items: [{ at: '2026-02-01' }],
      either: { at: '2026-03-01T00:00:00Z' },
      extra: '2026-01-01',
    }) as Record<string, unknown>
    expect(value.brewedAt).toBeInstanceOf(Date)
    expect(value.roastDate).toBeNull()
    expect(value.notes).toBe('2026-01-02T03:04:05.000Z')
    expect((value.items as { at: unknown }[])[0]?.at).toBeInstanceOf(Date)
    expect((value.either as { at: unknown }).at).toBeInstanceOf(Date)
    expect(value.extra).toBe('2026-01-01')
  })

  test('describes dates as ISO strings in JSON Schema', () => {
    const json = toInputJsonSchema(schema) as {
      properties: Record<string, { type?: string; format?: string }>
    }
    expect(json.properties.brewedAt).toMatchObject({
      type: 'string',
      format: 'date-time',
    })
  })

  test('validates with readable errors and passes revived input on', () => {
    const input = integrationInput(
      z.object({ id: z.number().int().positive(), at: z.date().optional() }),
    )
    expect(() => input.parse({ id: 0 })).toThrow(IntegrationInputError)
    expect(() => input.parse({ id: 0 })).toThrow(/^id: /)
    const parsed = input.parse({ id: 3, at: '2026-01-01T00:00:00Z' }) as {
      at: Date
    }
    expect(parsed.at).toBeInstanceOf(Date)
    expect(input['~standard'].validate({ id: 'x' })).toMatchObject({
      issues: [{ path: ['id'] }],
    })
  })
})
