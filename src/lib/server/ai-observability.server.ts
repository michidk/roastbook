import '@tanstack/react-start/server-only'
import { PostHog } from 'posthog-node'
import { getJournalContext } from '@/db/journal-context.server'
import type { AiTokenTotals } from '@/lib/ai-token-usage'
import { getServerEnv } from '@/lib/env.server'

type AiCaptureInput = {
  systemPrompts?: readonly string[]
  messages: readonly { role: string; content: unknown }[]
  tools?: unknown
}

type AiGenerationCapture = {
  model: string
  requestType: string
  baseURL: string
  durationMs: number
  usage: AiTokenTotals
  input?: AiCaptureInput
  output?: unknown
  error?: Error
  additionalProperties?: Record<string, unknown>
}

let posthogClient: PostHog | undefined
const processAiSessionId = crypto.randomUUID()

function getPostHogClient() {
  if (posthogClient) return posthogClient

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

  posthogClient = new PostHog(env.POSTHOG_PROJECT_KEY, {
    host: env.POSTHOG_HOST,
    privacyMode: false,
    enableExceptionAutocapture: true,
  })
  return posthogClient
}

function captureContent(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((part) => {
    if (
      part &&
      typeof part === 'object' &&
      ('type' in part && part.type === 'image' ||
        'source' in part &&
          part.source &&
          typeof part.source === 'object' &&
          'type' in part.source &&
          part.source.type === 'data')
    )
      return { type: 'image', image: '[binary image omitted]' }
    return part
  })
}

function captureInput(input: AiCaptureInput | undefined) {
  if (!input) return undefined
  return [
    ...(input.systemPrompts ?? []).map((content) => ({
      role: 'system',
      content,
    })),
    ...input.messages.map(({ role, content }) => ({
      role,
      content: captureContent(content),
    })),
  ]
}

function captureOutput(output: unknown) {
  if (output === undefined) return undefined
  return [{ role: 'assistant', content: output }]
}

export function captureAiGeneration({
  model,
  requestType,
  baseURL,
  durationMs,
  usage,
  input,
  output,
  error,
  additionalProperties,
}: AiGenerationCapture) {
  const identity = getJournalContext()?.identity
  if (!identity) return

  try {
    const posthog = getPostHogClient()
    if (!posthog) return
    posthog.capture({
      distinctId: identity.id,
      event: '$ai_generation',
      properties: {
        $ai_trace_id: crypto.randomUUID(),
        $ai_session_id: processAiSessionId,
        $ai_span_id: crypto.randomUUID(),
        $ai_span_name: requestType,
        $ai_model: model,
        $ai_provider: 'openai-compatible',
        $ai_base_url: baseURL,
        $ai_input: captureInput(input),
        $ai_tools: input?.tools,
        $ai_output_choices: captureOutput(output),
        $ai_input_tokens: usage.promptTokens,
        $ai_output_tokens: usage.completionTokens,
        $ai_cache_read_input_tokens:
          usage.promptTokensDetails?.cachedTokens,
        $ai_latency: durationMs / 1000,
        $ai_is_error: Boolean(error),
        $ai_error: error?.message,
        request_type: requestType,
        ...additionalProperties,
      },
    })
  } catch (error) {
    console.error('Could not capture AI observability event', {
      requestType,
      error,
    })
  }
}
