import '@tanstack/react-start/server-only'
import { requireIdentity } from '@/db/journal-context.server'
import { getServerEnv } from '@/lib/env.server'
import type { ImageEditAccounting } from '@/lib/image-edit-accounting'

export function imageEditEvent({
  logId,
  accounting,
  durationMs,
  failed,
}: {
  logId: number
  accounting: ImageEditAccounting
  durationMs: number
  failed: boolean
}) {
  return {
    event: '$ai_generation',
    properties: {
      $ai_trace_id: `image-edit-${logId}`,
      $ai_span_id: `image-edit-${logId}`,
      $ai_model: accounting.model,
      $ai_provider: 'openai-compatible',
      $ai_latency: durationMs / 1000,
      $ai_is_error: failed,
      ...(accounting.usage
        ? {
            $ai_input_tokens: accounting.usage.input_tokens,
            $ai_output_tokens: accounting.usage.output_tokens,
            image_input_tokens:
              accounting.usage.input_tokens_details.image_tokens,
            text_input_tokens:
              accounting.usage.input_tokens_details.text_tokens,
          }
        : {}),
      ...(accounting.totalCost !== null
        ? {
            $ai_input_cost: accounting.inputCost,
            $ai_output_cost: accounting.outputCost,
            $ai_total_cost: accounting.totalCost,
          }
        : {}),
      cost_known: accounting.totalCost !== null,
      pricing_version: accounting.pricing?.version ?? null,
      request_type: 'image-beautification',
    },
  }
}

export async function reportImageEdit(
  input: Parameters<typeof imageEditEvent>[0],
) {
  const env = getServerEnv()
  if (!env.POSTHOG_PROJECT_KEY) return
  try {
    const response = await fetch(`${env.POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.POSTHOG_PROJECT_KEY,
        distinct_id: requireIdentity().id,
        ...imageEditEvent(input),
      }),
      signal: AbortSignal.timeout(3_000),
      redirect: 'error',
    })
    if (!response.ok)
      console.error('Image cost telemetry was not accepted', {
        requestLogId: input.logId,
      })
  } catch {
    console.error('Could not report image cost telemetry', {
      requestLogId: input.logId,
    })
  }
}
