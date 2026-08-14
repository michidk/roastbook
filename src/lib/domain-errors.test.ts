import { describe, expect, test } from 'bun:test'
import { expectReturnedRow } from '@/lib/domain-errors'

describe('domain errors', () => {
  test('requires mutations to return a persisted row', () => {
    expect(expectReturnedRow({ id: 1 }, 'Bean')).toEqual({ id: 1 })
    expect(() => expectReturnedRow(undefined, 'Bean')).toThrow('Bean not found')
  })
})
