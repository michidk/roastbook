import { searchEnum, searchRecord, searchString } from '@/lib/search-params'
import { type IntegrationScope, normalizeScopes } from './scopes'

/** Expiry choices for new keys; custom dates are picked in the dialog. */
export const KEY_EXPIRY_VALUES = [
  '30d',
  '90d',
  '1y',
  'custom',
  'never',
] as const
export type KeyExpiry = (typeof KEY_EXPIRY_VALUES)[number]

/**
 * `/settings/api` search parameters that open the new-key dialog with a name,
 * permissions and expiry filled in, like GitHub's token links. The owner still
 * reviews and confirms; a link never creates a key by itself.
 */
export type IntegrationKeySearch = {
  create?: true
  name?: string
  /** Comma-separated scopes, such as `shottimer:write`. */
  scopes?: string
  expires?: Exclude<KeyExpiry, 'custom'>
}

export function parseIntegrationKeySearch(
  input: unknown,
): IntegrationKeySearch {
  const search = searchRecord(input)
  if (search.create !== true) return {}
  const name = searchString(search.name, '', 80).trim()
  const scopes = normalizeScopes(
    searchString(search.scopes, '', 1000).split(','),
  )
  const expires = searchEnum(
    search.expires,
    ['30d', '90d', '1y', 'never'] as const,
    '90d',
  )
  return {
    create: true,
    ...(name ? { name } : {}),
    ...(scopes.length ? { scopes: scopes.join(',') } : {}),
    expires,
  }
}

export type IntegrationKeyPrefill = {
  readonly name: string
  readonly scopes: IntegrationScope[]
  readonly expires: KeyExpiry
}

/** The dialog's starting values from a link, or null without `create`. */
export function integrationKeyPrefill(
  search: IntegrationKeySearch,
): IntegrationKeyPrefill | null {
  if (!search.create) return null
  return {
    name: search.name ?? '',
    scopes: normalizeScopes(search.scopes?.split(',') ?? []),
    expires: search.expires ?? '90d',
  }
}
