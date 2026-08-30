import { describe, expect, test } from 'bun:test'
import {
  createShotAndSaveRecipeSchema,
  relatedShotListSchema,
  shotGroupListSchema,
  shotListSchema,
} from '@/lib/server/shot-list-contract.server'

describe('brew list contracts', () => {
  test('applies the canonical list defaults', () => {
    expect(shotListSchema.parse({})).toEqual({
      page: 1,
      sort: 'date',
      direction: 'desc',
    })
    expect(shotGroupListSchema.parse({})).toEqual({ page: 1 })
  })

  test('requires a positive related entity id', () => {
    expect(() => relatedShotListSchema.parse({ entityId: 0 })).toThrow()
    expect(relatedShotListSchema.parse({ entityId: 12 })).toMatchObject({
      entityId: 12,
      page: 1,
    })
  })

  test('requires both a valid brew and recipe target', () => {
    expect(() => createShotAndSaveRecipeSchema.parse({})).toThrow()
  })
})
