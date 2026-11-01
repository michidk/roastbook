import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  loadMcpAdminState,
  loadMcpAuditPage,
  saveMcpPolicy,
} from '@/lib/server/mcp/settings.server'

export const getMcpAdminState = createServerFn({ method: 'GET' }).handler(() =>
  loadMcpAdminState(),
)

export const updateMcpPolicy = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      enabled: z.boolean(),
      disabledTools: z.array(z.string().max(100)).max(200),
    }),
  )
  .handler(({ data }) => saveMcpPolicy(data))

export const getMcpAuditPage = createServerFn({ method: 'GET' })
  .validator(z.object({ page: z.number().int().min(0).max(10_000) }))
  .handler(({ data }) => loadMcpAuditPage(data.page))
