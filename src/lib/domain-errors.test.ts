import { describe, expect, test } from 'bun:test'
import { DomainError, expectReturnedRow, notFound } from '@/lib/domain-errors'

describe('domain errors', () => {
  test('preserves a machine-readable code with a displayable message', () => {
    const error = notFound('Bean')

    expect(error).toBeInstanceOf(DomainError)
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('Bean not found')
  })

  test('requires mutations to return a persisted row', () => {
    expect(expectReturnedRow({ id: 1 }, 'Bean')).toEqual({ id: 1 })
    expect(() => expectReturnedRow(undefined, 'Bean')).toThrow('Bean not found')
  })
})
