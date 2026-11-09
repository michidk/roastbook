import {
  type ChatMiddleware,
  chat,
  fromSpecTokenUsage,
  type ModelMessage,
} from '@tanstack/ai'
import type { webSearchTool } from '@tanstack/ai-openai/tools'
import type { z } from 'zod'
import * as defaultRecorder from '@/extension-points/ai-request-recorder.server'
import { addAiTokenUsage, EMPTY_AI_TOKEN_TOTALS } from '@/lib/ai-token-usage'
import { captureAiGeneration } from './ai-observability.server'
import { AiProviderRequestError } from './ai-provider-fetch.server'
import { logAiRequestOutcome } from './posthog-logs.server'
import { type AiProviderConfig, createAiAdapter } from './ai-runtime.server'

export type AiRequestRecorder = Pick<
  typeof defaultRecorder,
  'startAiRequestLog' | 'completeAiRequestLog' | 'failAiRequestLog'
>

type AiInput = { systemPrompts?: string[]; messages: ModelMessage[] }
type AiTextInput = AiInput & {
  format: 'text' | 'json-object'
  tools?: Array<ReturnType<typeof webSearchTool>>
}
type AiObjectInput<T> = AiInput & { outputSchema: z.ZodType<T, T> }
type AiRequestContext = {
  generateText(input: AiTextInput): Promise<string>
  generateObject<T>(input: AiObjectInput<T>): Promise<T>
}
type AiRequestOptions<T> = {
  config: AiProviderConfig
  model: string
  requestType: string
  timeoutMs: number
  requestPayload: unknown
  recordContent?: boolean
  execute(context: AiRequestContext): Promise<T>
}

export class AiOutputError extends Error {}

export async function runAiRequest<T>(
  options: AiRequestOptions<T>,
  recorder: AiRequestRecorder = defaultRecorder,
): Promise<T> {
  const { config, model } = options
  const logId = await recorder.startAiRequestLog({
    providerMode: config.providerMode,
    requestType: options.requestType,
    model,
    requestPayload: options.requestPayload,
  })
  const startedAt = Date.now()
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), options.timeoutMs)
  let usage = EMPTY_AI_TOKEN_TOTALS
  let generationInput: (AiInput & { tools?: unknown }) | undefined
  let terminalError: Error | undefined
  let transportError: AiProviderRequestError | undefined
  const middleware: ChatMiddleware = {
    name: 'roastbook-ai-result',
    onUsage: (_context, next) => {
      usage = addAiTokenUsage(usage, next)
    },
    onChunk: (_context, chunk) => {
      if (chunk.type === 'RUN_ERROR') {
        if (chunk.usage) {
          const next = Array.isArray(chunk.usage)
            ? fromSpecTokenUsage(chunk.usage)
            : chunk.usage
          if (next) usage = addAiTokenUsage(usage, next)
        }
        terminalError = new AiOutputError(
          'The AI provider could not complete the response. Check the selected model and try again.',
        )
      }
      if (
        chunk.type === 'RUN_FINISHED' &&
        chunk.finishReason &&
        chunk.finishReason !== 'stop' &&
        chunk.finishReason !== 'tool_calls'
      ) {
        terminalError = new AiOutputError(
          'The AI response was incomplete or refused. Please try again.',
        )
      }
    },
    onFinish: (_context, info) => {
      if (usage.totalTokens === 0 && info.usage)
        usage = addAiTokenUsage(usage, info.usage)
      if (
        info.finishReason &&
        info.finishReason !== 'stop' &&
        info.finishReason !== 'tool_calls'
      ) {
        terminalError = new AiOutputError(
          'The AI response was incomplete or refused. Please try again.',
        )
      }
    },
    onAbort: () => {
      abortController.abort()
    },
    onError: () => {
      terminalError ??= new AiOutputError(
        'AI request failed. Check the provider, API format, and model capabilities in Settings > AI.',
      )
    },
  }
  const assertComplete = () => {
    if (abortController.signal.aborted)
      throw new AiOutputError('AI request timed out. Please try again.')
    if (terminalError) throw terminalError
  }
  try {
    const requestFetch: typeof fetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          return await config.fetch(input, init)
        } catch (error) {
          if (error instanceof AiProviderRequestError) transportError = error
          throw error
        }
      },
      { preconnect: config.fetch.preconnect },
    )
    const adapter = createAiAdapter(model, { ...config, fetch: requestFetch })
    const common = {
      adapter,
      abortController,
      middleware: [middleware],
      threadId: crypto.randomUUID(),
      stream: false as const,
      debug: false,
    }
    const result = await options.execute({
      async generateText(input) {
        generationInput = input
        const modelOptions =
          input.format === 'json-object'
            ? config.api === 'responses'
              ? {
                  store: false,
                  text: { format: { type: 'json_object' as const } },
                }
              : {
                  store: false,
                  response_format: { type: 'json_object' as const },
                }
            : { store: false }
        const { text } = await chat({ ...input, ...common, modelOptions })
        assertComplete()
        if (!text.trim())
          throw new AiOutputError(
            'The AI provider returned no answer. Please try again.',
          )
        return text
      },
      async generateObject(input) {
        generationInput = input
        const value = await chat({
          ...input,
          ...common,
          modelOptions: { store: false },
        })
        assertComplete()
        return value
      },
    })
    assertComplete()
    const durationMs = Date.now() - startedAt
    await recorder.completeAiRequestLog({
      logId,
      model,
      usage,
      responsePayload: options.recordContent ? result : { completed: true },
      durationMs,
    })
    captureAiGeneration({
      model,
      requestType: options.requestType,
      baseURL: config.baseURL,
      durationMs,
      usage,
      input: generationInput,
      output: result,
    })
    logAiRequestOutcome('completed', options.requestType, durationMs)
    console.info('[AI request] completed', {
      requestLogId: logId,
      requestType: options.requestType,
    })
    return result
  } catch (error) {
    const safeError = abortController.signal.aborted
      ? new AiOutputError('AI request timed out. Please try again.')
      : transportError
        ? transportError
        : error instanceof AiOutputError
          ? error
          : (terminalError ??
            new AiOutputError(
              'AI request failed or returned invalid output. Check the provider, API format, and model capabilities in Settings > AI.',
            ))
    const durationMs = Date.now() - startedAt
    await recorder.failAiRequestLog({
      logId,
      model,
      error: safeError,
      usage,
      aborted: abortController.signal.aborted,
      durationMs,
    })
    captureAiGeneration({
      model,
      requestType: options.requestType,
      baseURL: config.baseURL,
      durationMs,
      usage,
      input: generationInput,
      error: safeError,
    })
    logAiRequestOutcome('failed', options.requestType, durationMs)
    console.error('[AI request] failed', {
      requestLogId: logId,
      requestType: options.requestType,
      aborted: abortController.signal.aborted,
    })
    throw safeError
  } finally {
    clearTimeout(timeout)
  }
}
