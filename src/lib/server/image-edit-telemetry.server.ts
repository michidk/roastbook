import '@tanstack/react-start/server-only'
import type { ImageEditAccounting } from '@/lib/image-edit-accounting'
import { captureAiGeneration } from './ai-observability.server'

export function reportImageEdit({
  accounting,
  durationMs,
  failed,
  prompt,
  baseURL,
}: {
  logId: number
  accounting: ImageEditAccounting
  durationMs: number
  failed: boolean
  prompt: string
  baseURL: string
}) {
  const usage = accounting.usage
  captureAiGeneration({
    model: accounting.model,
    requestType: 'image-beautification',
    baseURL,
    durationMs,
    usage: {
      promptTokens: usage?.input_tokens ?? 0,
      completionTokens: usage?.output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      promptTokensDetails: {
        cachedTokens: usage?.input_tokens_details.cached_tokens ?? 0,
      },
    },
    input: { systemPrompts: [prompt], messages: [] },
    error: failed
      ? new Error('The image provider could not complete this edit')
      : undefined,
    additionalProperties: {
      image_input_tokens: usage?.input_tokens_details.image_tokens ?? 0,
      text_input_tokens: usage?.input_tokens_details.text_tokens ?? 0,
      ...(accounting.totalCost !== null
        ? {
            $ai_input_cost_usd: accounting.inputCost,
            $ai_output_cost_usd: accounting.outputCost,
            $ai_total_cost_usd: accounting.totalCost,
          }
        : {}),
      cost_known: accounting.totalCost !== null,
      pricing_version: accounting.pricing?.version ?? null,
    },
  })
}
