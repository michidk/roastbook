import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  loadAiRequestLog,
  loadAiRequestLogs,
  loadAiRequestStats,
} from '@/lib/server/ai-request-logs.server'

export type {
  AiRequestLogEntry,
  AiRequestLogPage,
  AiRequestLogSummary,
  AiRequestStats,
  AiRequestStatus,
} from '@/lib/server/ai-request-logs.server'

const aiRequestLogPageSchema = z.object({
  cursor: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

export const getAiRequestStats = createServerFn({ method: 'GET' }).handler(
  loadAiRequestStats,
)

export const getAiRequestLogs = createServerFn({ method: 'GET' })
  .validator(aiRequestLogPageSchema)
  .handler(({ data }) => loadAiRequestLogs(data))

export const getAiRequestLog = createServerFn({ method: 'GET' })
  .validator(z.number().int().positive())
  .handler(({ data: id }) => loadAiRequestLog(id))
