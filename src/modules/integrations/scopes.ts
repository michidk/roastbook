/**
 * Scopes shared by API keys, MCP tokens and MCP applications. A scope grants
 * one access level to one part of the journal: `<resource>:read` or
 * `<resource>:write`. Write access always includes read access. There are no
 * account or administration scopes: integrations never manage users,
 * credentials, sign-in or instance settings.
 */
export const INTEGRATION_RESOURCES = [
  {
    id: 'brews',
    label: 'Brews',
    description: 'Logged brews, their pictures and brew analytics',
  },
  {
    id: 'beans',
    label: 'Beans',
    description: 'Beans, bags you bought and their pictures',
  },
  { id: 'roasters', label: 'Roasters', description: 'Roasters' },
  {
    id: 'gear',
    label: 'Equipment',
    description: 'Gear, gear sets and their pictures',
  },
  { id: 'recipes', label: 'Recipes', description: 'Saved brewing recipes' },
  {
    id: 'places',
    label: 'Places',
    description: 'Coffee shops and their pictures',
  },
  {
    id: 'visits',
    label: 'Café visits',
    description: 'Café visits and their pictures',
  },
  {
    id: 'methods',
    label: 'Methods & drinks',
    description: 'Brewing methods, drink types and drink options',
  },
  { id: 'tags', label: 'Taste tags', description: 'Your taste tags' },
  {
    id: 'shottimer',
    label: 'Shottimer',
    description: 'Report brew times from a device and read the target time',
  },
  {
    id: 'stats',
    label: 'Statistics',
    description: 'Dashboard and detailed brewing statistics',
    readOnly: true,
  },
] as const satisfies readonly {
  id: string
  label: string
  description: string
  readOnly?: boolean
}[]

export type IntegrationResource = (typeof INTEGRATION_RESOURCES)[number]['id']
export type IntegrationAccess = 'read' | 'write'
type ResourceEntry = (typeof INTEGRATION_RESOURCES)[number]
/** Every valid scope; read-only resources have no `:write` scope. */
export type IntegrationScope = {
  [Entry in ResourceEntry as Entry['id']]: Entry extends { readOnly: true }
    ? `${Entry['id']}:read`
    : `${Entry['id']}:${IntegrationAccess}`
}[IntegrationResource]
/** What a credential may do with one resource. */
export type IntegrationAccessLevel = 'none' | IntegrationAccess

const isReadOnly = (resource: (typeof INTEGRATION_RESOURCES)[number]) =>
  'readOnly' in resource && resource.readOnly

export const INTEGRATION_SCOPES = INTEGRATION_RESOURCES.flatMap(
  (resource) =>
    isReadOnly(resource)
      ? [`${resource.id}:read`]
      : [`${resource.id}:read`, `${resource.id}:write`],
  // Read-only resources get no write scope, as the type requires.
) as readonly IntegrationScope[]

const known = new Set<string>(INTEGRATION_SCOPES)

export function isIntegrationScope(value: string): value is IntegrationScope {
  return known.has(value)
}

/** Known scopes only, write implying read, in catalog order. */
export function normalizeScopes(values: Iterable<string>): IntegrationScope[] {
  const granted = new Set<string>()
  for (const value of values) {
    if (!isIntegrationScope(value)) continue
    granted.add(value)
    if (value.endsWith(':write')) granted.add(value.replace(/:write$/, ':read'))
  }
  return INTEGRATION_SCOPES.filter((scope) => granted.has(scope))
}

export function hasScope(
  scopes: readonly string[],
  resource: IntegrationResource,
  access: IntegrationAccess,
) {
  return (
    scopes.includes(`${resource}:${access}`) ||
    (access === 'read' && scopes.includes(`${resource}:write`))
  )
}

export type IntegrationAccessLevels = Record<
  IntegrationResource,
  IntegrationAccessLevel
>

export function accessLevelsFromScopes(
  scopes: readonly string[],
): IntegrationAccessLevels {
  return Object.fromEntries(
    INTEGRATION_RESOURCES.map((resource) => [
      resource.id,
      hasScope(scopes, resource.id, 'write')
        ? 'write'
        : hasScope(scopes, resource.id, 'read')
          ? 'read'
          : 'none',
    ]),
  ) as IntegrationAccessLevels
}

export function scopesFromAccessLevels(
  levels: Partial<Record<IntegrationResource, IntegrationAccessLevel>>,
): IntegrationScope[] {
  return normalizeScopes(
    INTEGRATION_RESOURCES.flatMap((resource) => {
      const level = levels[resource.id] ?? 'none'
      if (level === 'none') return []
      return [`${resource.id}:${isReadOnly(resource) ? 'read' : level}`]
    }),
  )
}

/** Every read scope, and with `write` every scope. */
export function allScopes(access: IntegrationAccess): IntegrationScope[] {
  return INTEGRATION_SCOPES.filter(
    (scope) => access === 'write' || scope.endsWith(':read'),
  )
}

/**
 * OAuth clients request the protocol scopes `mcp:read` and `mcp:write`. They
 * cap what the owner can approve for a connected application.
 */
export function scopesAllowedByProtocol(protocolScopes: readonly string[]) {
  if (protocolScopes.includes('mcp:write')) return allScopes('write')
  if (protocolScopes.includes('mcp:read')) return allScopes('read')
  return []
}

/** A short human summary, such as "Read & write: Brews · Read: Beans". */
export function describeScopes(scopes: readonly string[]) {
  const granted = normalizeScopes(scopes)
  if (!granted.length) return 'No access'
  if (allScopes('write').every((scope) => granted.includes(scope)))
    return 'Full read & write access'
  const levels = accessLevelsFromScopes(granted)
  const labels = (level: IntegrationAccessLevel) =>
    INTEGRATION_RESOURCES.filter((resource) => levels[resource.id] === level)
      .map((resource) => resource.label)
      .join(', ')
  if (
    !labels('write') &&
    allScopes('read').every((scope) => granted.includes(scope))
  )
    return 'Full read access'
  return [
    labels('write') ? `Read & write: ${labels('write')}` : '',
    labels('read') ? `Read: ${labels('read')}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
