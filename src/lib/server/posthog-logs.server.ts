import '@tanstack/react-start/server-only'
import type { Logger } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { getJournalContext } from '@/db/journal-context.server'
import { getServerEnv } from '@/lib/env.server'

let posthogLogger: Logger | undefined
let initializationAttempted = false

function getPostHogLogger() {
  if (initializationAttempted) return posthogLogger
  initializationAttempted = true

  const env = getServerEnv()
  if (!env.POSTHOG_PROJECT_KEY || !env.POSTHOG_HOST) {
    if (process.env.NODE_ENV !== 'production') {
      const variable = env.POSTHOG_PROJECT_KEY
        ? 'POSTHOG_HOST'
        : 'POSTHOG_PROJECT_KEY'
      console.warn(
        `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
      )
    }
    return undefined
  }

  try {
    const exporter = new OTLPLogExporter({
      url: `${env.POSTHOG_HOST}/i/v1/logs`,
      headers: { Authorization: `Bearer ${env.POSTHOG_PROJECT_KEY}` },
    })
    const provider = new LoggerProvider({
      resource: resourceFromAttributes({ 'service.name': 'roastbook-server' }),
      processors: [new BatchLogRecordProcessor(exporter)],
    })
    posthogLogger = provider.getLogger('roastbook.posthog')
  } catch (error) {
    console.error('Could not initialize PostHog log capture', error)
  }

  return posthogLogger
}

export function logAiRequestOutcome(
  outcome: 'completed' | 'failed',
  requestType: string,
  durationMs: number,
) {
  try {
    const logger = getPostHogLogger()
    if (!logger) return

    const attributes: Record<string, string | number> = {
      event: `ai_request.${outcome}`,
      request_type: requestType,
      duration_ms: durationMs,
    }
    const identity = getJournalContext()?.identity
    if (identity) attributes.posthogDistinctId = identity.id

    logger.emit({
      severityText: outcome === 'completed' ? 'INFO' : 'ERROR',
      body: `AI request ${outcome}`,
      attributes,
    })
  } catch (error) {
    console.error('Could not emit PostHog log record', error)
  }
}
