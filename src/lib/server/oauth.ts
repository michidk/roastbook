import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { reauthenticationTokenSchema } from '@/modules/auth/reauthentication'
import {
  approveConsentAccess,
  denyConsentAccess,
  loadConsent,
  revokeOAuthGrant,
  updateOAuthGrantAccess,
} from './auth/oauth-grants.server'

const scopeList = z.array(z.string().max(40)).max(100)

function consentQuery(query: string | undefined) {
  const url = new URL(getRequest().url)
  // Router search parsing collapses repeated OAuth signature parameter names.
  // On SSR use the original request; RPC calls send the original browser query.
  return url.pathname === '/oauth/consent' ? url.search.slice(1) : (query ?? '')
}

export const getOAuthConsent = createServerFn({ method: 'GET' })
  .validator(z.object({ query: z.string().min(1).max(16_384).optional() }))
  .handler(({ data }) => loadConsent(consentQuery(data.query)))
export const approveOAuthConsentAccess = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      query: z.string().min(1).max(16_384),
      scopes: scopeList,
      reauthToken: reauthenticationTokenSchema,
    }),
  )
  .handler(({ data }) =>
    approveConsentAccess(
      consentQuery(data.query),
      data.scopes,
      getRequest().headers,
      data.reauthToken,
    ),
  )
export const denyOAuthConsent = createServerFn({ method: 'POST' })
  .validator(z.object({ query: z.string().min(1).max(16_384) }))
  .handler(({ data }) =>
    denyConsentAccess(consentQuery(data.query), getRequest().headers),
  )
export const updateOAuthGrantPermissions = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().min(1).max(512),
      scopes: scopeList,
      reauthToken: reauthenticationTokenSchema,
    }),
  )
  .handler(({ data }) =>
    updateOAuthGrantAccess(data.id, data.scopes, data.reauthToken),
  )
export const disconnectOAuthGrant = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1).max(512) }))
  .handler(({ data }) => revokeOAuthGrant(data.id))
