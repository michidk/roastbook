import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { loadConsent, revokeOAuthGrant } from './auth/oauth-grants.server'

export const getOAuthConsent = createServerFn({ method: 'GET' })
  .validator(z.object({ query: z.string().min(1).max(16_384).optional() }))
  .handler(({ data }) => {
    const url = new URL(getRequest().url)
    // Router search parsing collapses repeated OAuth signature parameter names.
    // On SSR use the original request; RPC calls send the original browser query.
    return loadConsent(
      url.pathname === '/oauth/consent'
        ? url.search.slice(1)
        : (data.query ?? ''),
    )
  })
export const disconnectOAuthGrant = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1).max(512) }))
  .handler(({ data }) => revokeOAuthGrant(data.id))
