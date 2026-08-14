import { describe, expect, test } from 'bun:test'
import {
  escapedContainsPattern,
  resolvePagination,
} from '@/lib/collection-query'

describe('collection query helpers', () => {
  test('escapes SQL LIKE wildcard and escape characters', () => {
    expect(escapedContainsPattern('50%_\\')).toBe('%50\\%\\_\\\\%')
  })

  test('clamps a requested page to the available result set', () => {
    expect(resolvePagination(26, 9, 10)).toEqual({
      page: 3,
      pageSize: 10,
      totalItems: 26,
      totalPages: 3,
    })
    expect(resolvePagination(0, 4, 10).page).toBe(1)
  })
})
