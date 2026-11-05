import { describe, expect, test } from 'bun:test'
import { integrationKeyPrefill, parseIntegrationKeySearch } from './key-link'

describe('new-key links', () => {
  test('fill in a name, known scopes and the expiry', () => {
    const search = parseIntegrationKeySearch({
      create: true,
      name: ' Shottimer ',
      scopes: 'shottimer:write,admin:write,beans:read',
      expires: 'never',
    })
    expect(search).toEqual({
      create: true,
      name: 'Shottimer',
      scopes: 'beans:read,shottimer:read,shottimer:write',
      expires: 'never',
    })
    expect(integrationKeyPrefill(search)).toEqual({
      name: 'Shottimer',
      scopes: ['beans:read', 'shottimer:read', 'shottimer:write'],
      expires: 'never',
    })
  })

  test('ignore links without create and unknown expiry values', () => {
    expect(
      parseIntegrationKeySearch({ name: 'x', scopes: 'brews:read' }),
    ).toEqual({})
    expect(integrationKeyPrefill({})).toBeNull()
    expect(
      parseIntegrationKeySearch({ create: true, expires: 'forever' }).expires,
    ).toBe('7d')
  })
})
