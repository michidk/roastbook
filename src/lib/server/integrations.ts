import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getServerEnv } from '@/lib/env.server'
import {
  createIntegrationCredential,
  revokeIntegrationCredential,
  updateIntegrationCredential,
} from '@/lib/server/auth/integrations.server'
import { reauthenticationTokenSchema } from '@/modules/auth/reauthentication'
import { loadIntegrationSettings } from './integrations/settings.server'
import { getMcpEndpoint } from './mcp/config.server'

const name = z.string().trim().min(1).max(80)
const scopes = z.array(z.string().max(40)).min(1).max(100)

export const getApiAccessState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const origin = getMcpEndpoint(
      getServerEnv().PUBLIC_URL ?? getRequest(),
    ).origin
    return {
      baseUrl: `${origin}/api/v1`,
      documentationUrl: `${origin}/api/v1/openapi.json`,
      ...(await loadIntegrationSettings('api')),
    }
  },
)

export const createIntegrationKey = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      kind: z.enum(['api', 'mcp']),
      name,
      scopes,
      expiresAt: z.iso.datetime({ offset: true }).nullable(),
      reauthToken: reauthenticationTokenSchema,
    }),
  )
  .handler(({ data }) =>
    createIntegrationCredential({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    }),
  )

export const updateIntegrationKey = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.uuid(),
      name,
      scopes,
      reauthToken: reauthenticationTokenSchema,
    }),
  )
  .handler(({ data }) => updateIntegrationCredential(data))

export const revokeIntegrationKey = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(({ data }) => revokeIntegrationCredential(data.id))
