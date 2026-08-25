import { describe, expect, test } from 'bun:test'
import { getErrorDisplayState, toDisplayableError } from '@/lib/error-display'

describe('error display state', () => {
  test('unwraps displayable database-unavailable errors', () => {
    expect(
      getErrorDisplayState(
        new Error('Database unavailable: PostgreSQL is not reachable.'),
      ),
    ).toEqual({
      title: 'Database unavailable',
      message: 'PostgreSQL is not reachable.',
      hint: 'Start the local Postgres service or container, then retry the page.',
    })
  })

  test('unwraps displayable not-configured errors', () => {
    expect(
      getErrorDisplayState(
        new Error('Database not configured: DATABASE_URL is missing.'),
      ),
    ).toEqual({
      title: 'Database not configured',
      message: 'DATABASE_URL is missing.',
      hint: 'Add DATABASE_URL to your environment before starting the dev server.',
    })
  })

  test('unwraps displayable not-initialized errors', () => {
    expect(
      getErrorDisplayState(
        new Error('Database not initialized: Tables are missing.'),
      ),
    ).toEqual({
      title: 'Database not initialized',
      message: 'Tables are missing.',
      hint: 'Run the Drizzle migrations, then retry the page.',
    })
  })

  test('classifies raw connection-refused errors as database unavailable', () => {
    const state = getErrorDisplayState(
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
    )
    expect(state.title).toBe('Database unavailable')
    expect(state.message).toBe(
      "Roastbook couldn't reach PostgreSQL at the configured DATABASE_URL.",
    )
  })

  test('classifies missing DATABASE_URL errors as not configured', () => {
    const state = getErrorDisplayState(
      new Error('DATABASE_URL environment variable is required'),
    )
    expect(state.title).toBe('Database not configured')
    expect(state.message).toBe(
      'Roastbook is missing its DATABASE_URL configuration.',
    )
  })

  test('classifies failed queries against missing app tables as not initialized', () => {
    const state = getErrorDisplayState(
      new Error('Failed query: relation "brews" does not exist'),
    )
    expect(state.title).toBe('Database not initialized')
    expect(state.hint).toBe('Run the Drizzle migrations, then retry the page.')
  })

  test('requires both the failed-query marker and a known relation', () => {
    expect(
      getErrorDisplayState(new Error('relation "brews" does not exist')).title,
    ).toBe('Failed to load')
    expect(
      getErrorDisplayState(
        new Error('Failed query: relation "unknown" does not exist'),
      ).title,
    ).toBe('Failed to load')
  })

  test('falls back to a generic state for unknown and empty errors', () => {
    const fallback = {
      title: 'Failed to load',
      message: 'Something went wrong while loading this page.',
    }
    expect(getErrorDisplayState(new Error('boom'))).toEqual(fallback)
    expect(getErrorDisplayState(new Error(''))).toEqual(fallback)
  })
})

describe('displayable error conversion', () => {
  test('wraps connection failures with the database-unavailable prefix', () => {
    expect(
      toDisplayableError(new Error('connection refused by server')).message,
    ).toBe(
      "Database unavailable: Roastbook couldn't reach PostgreSQL at the configured DATABASE_URL.",
    )
  })

  test('wraps missing configuration with the not-configured prefix', () => {
    expect(
      toDisplayableError('DATABASE_URL environment variable is required')
        .message,
    ).toBe(
      'Database not configured: Roastbook is missing its DATABASE_URL configuration.',
    )
  })

  test('wraps missing app tables with the not-initialized prefix', () => {
    expect(
      toDisplayableError(new Error('relation "beans" does not exist')).message,
    ).toBe(
      'Database not initialized: Roastbook connected to PostgreSQL, but the app tables have not been created yet.',
    )
  })

  test('classifies string errors and passes unrecognized Errors through', () => {
    const original = new Error('boom')
    expect(toDisplayableError(original)).toBe(original)
    expect(toDisplayableError('connect ECONNREFUSED').message).toStartWith(
      'Database unavailable:',
    )
  })

  test('converts non-Error, non-string inputs to an unknown error', () => {
    expect(toDisplayableError(undefined).message).toBe('Unknown error')
    expect(toDisplayableError({ code: 42 }).message).toBe('Unknown error')
    expect(toDisplayableError('mystery string').message).toBe('Unknown error')
  })
})
