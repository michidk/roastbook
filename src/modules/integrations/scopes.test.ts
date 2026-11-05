import { describe, expect, test } from 'bun:test'
import {
  accessLevelsFromScopes,
  allScopes,
  describeScopes,
  hasScope,
  INTEGRATION_RESOURCES,
  INTEGRATION_SCOPES,
  normalizeScopes,
  scopesAllowedByProtocol,
  scopesFromAccessLevels,
} from './scopes'

describe('integration scopes', () => {
  test('has read and write per resource, statistics read-only, no admin scopes', () => {
    expect<readonly string[]>(INTEGRATION_SCOPES).toEqual(
      INTEGRATION_RESOURCES.flatMap<string>((resource) =>
        'readOnly' in resource && resource.readOnly
          ? [`${resource.id}:read`]
          : [`${resource.id}:read`, `${resource.id}:write`],
      ),
    )
    expect(
      INTEGRATION_RESOURCES.filter(
        (resource) => 'readOnly' in resource && resource.readOnly,
      ).map((resource) => resource.id),
    ).toEqual(['stats'])
    expect(INTEGRATION_SCOPES).toHaveLength(
      INTEGRATION_RESOURCES.length * 2 - 1,
    )
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
