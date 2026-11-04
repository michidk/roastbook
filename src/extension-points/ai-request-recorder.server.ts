import '@tanstack/react-start/server-only'

export interface AiRequestStart {
  providerMode: string
  requestType: string
  model: string
  requestPayload: unknown
}

// Default: every AI request is logged with its token usage in the database.
// An extension can replace this module to account for usage differently.
export {
  completeAiRequestLog,
  createAiRequestLogMiddleware,
  failAiRequestLog,
  startAiRequestLog,
} from '@/lib/server/ai-request-logs.server'
