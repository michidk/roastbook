import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { loadAdminAiReport } from './admin-ai.server'

export const getAdminAiReport = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      includeByo: z.boolean().default(false),
      days: z.number().int().min(1).max(365).default(30),
      cursor: z.number().int().positive().optional(),
    }),
  )
  .handler(({ data }) => loadAdminAiReport(data))
