import '@tanstack/react-start/server-only'
import type { ChatMiddleware } from '@tanstack/ai'

export interface AiRequestStart {
  providerMode: string
  requestType: string
  model: string
  requestPayload: unknown
}

// Default: AI requests are not recorded. An extension can replace this module
// to account for usage or keep a request log.
export async function startAiRequestLog(
  _request: AiRequestStart,
): Promise<number | undefined> {
  return undefined
}

export function createAiRequestLogMiddleware(
  _logId: number | undefined,
  _model: string,
): ChatMiddleware {
  return {}
}

export async function completeAiRequestLog(_result: {
  logId: number | undefined
  model: string
  responsePayload: unknown
  usage?: unknown
  durationMs: number
}): Promise<void> {}

export async function failAiRequestLog(_failure: {
  logId: number | undefined
  model: string
  error: unknown
  durationMs: number
}): Promise<void> {}
