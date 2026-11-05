import { describe, expect, test } from 'bun:test'
import {
  accessLevelsFromScopes,
  allScopes,
  describeScopes,
  hasScope,
  INTEGRATION_SCOPES,
  normalizeScopes,
  scopesAllowedByProtocol,
  scopesFromAccessLevels,
} from './scopes'

describe('integration scopes', () => {
  test('has read and write per resource, statistics read-only, no admin scopes', () => {
    expect(INTEGRATION_SCOPES).toContain('brews:write')
    expect(INTEGRATION_SCOPES).toContain('stats:read')
    expect(INTEGRATION_SCOPES).not.toContain('stats:write')
    expect(
      INTEGRATION_SCOPES.some((scope) => /admin|account|user/.test(scope)),
    ).toBe(false)
  })

  test('normalizes: unknown scopes dropped, write implies read', () => {
    expect(normalizeScopes(['beans:write', 'admin:write', 'nope'])).toEqual([
      'beans:read',
      'beans:write',
    ])
    expect(hasScope(['beans:write'], 'beans', 'read')).toBe(true)
    expect(hasScope(['beans:read'], 'beans', 'write')).toBe(false)
    expect(hasScope(['beans:write'], 'brews', 'read')).toBe(false)
  })

  test('round-trips per-resource access levels', () => {
    const scopes = scopesFromAccessLevels({
      brews: 'write',
      beans: 'read',
      stats: 'write',
    })
    expect(scopes).toEqual([
      'brews:read',
      'brews:write',
      'beans:read',
      'stats:read',
    ])
    expect(accessLevelsFromScopes(scopes)).toMatchObject({
      brews: 'write',
      beans: 'read',
      gear: 'none',
      stats: 'read',
    })
  })

  test('OAuth protocol scopes cap what can be approved', () => {
    expect(scopesAllowedByProtocol(['mcp:read'])).toEqual(allScopes('read'))
    expect(scopesAllowedByProtocol(['mcp:read', 'mcp:write'])).toEqual(
      allScopes('write'),
    )
    expect(scopesAllowedByProtocol(['offline_access'])).toEqual([])
  })

  test('describes access for people', () => {
    expect(describeScopes([])).toBe('No access')
    expect(describeScopes(allScopes('write'))).toBe('Full read & write access')
    expect(describeScopes(allScopes('read'))).toBe('Full read access')
    expect(describeScopes(['brews:write', 'beans:read'])).toBe(
      'Read & write: Brews · Read: Beans',
    )
  })
})
