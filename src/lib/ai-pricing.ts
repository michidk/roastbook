import type { TokenUsage } from '@tanstack/ai'
import {
  MODEL_PRICING_FALLBACK_MODELS,
  MODEL_PRICING_SOURCE,
  MODEL_PRICING_VERSION,
  MODEL_TOKEN_RATES,
  type ModelTokenRates,
} from '@/lib/ai-model-pricing'

export type TokenCostEstimate = {
  readonly usd: number
  readonly source:
    | 'provider'
    | typeof MODEL_PRICING_SOURCE
    | 'models.dev-fallback'
  readonly version: string | null
}

function ratesForModel(model: string): ModelTokenRates | undefined {
  // Responses can report a dated snapshot such as `gpt-5.1-2025-11-13`.
  return (
    MODEL_TOKEN_RATES[model] ??
    MODEL_TOKEN_RATES[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')]
  )
}

export function estimateTokenCost(
  model: string,
  usage: TokenUsage,
): TokenCostEstimate | null {
  if (usage.cost !== undefined && Number.isFinite(usage.cost)) {
    return {
      usd: Math.max(0, usage.cost),
      source: 'provider',
      version: null,
    }
  }

  const rates = ratesForModel(model)
  if (!rates) return null

  const selected =
    rates.longContext && usage.promptTokens > rates.longContext.thresholdTokens
      ? rates.longContext
      : rates
  const cachedTokens = Math.min(
    usage.promptTokens,
    usage.promptTokensDetails?.cachedTokens ?? 0,
  )
  const regularInputTokens = usage.promptTokens - cachedTokens

  return {
    usd:
      (regularInputTokens * selected.input +
        cachedTokens * selected.cachedInput +
        usage.completionTokens * selected.output) /
      1_000_000,
    source: MODEL_PRICING_FALLBACK_MODELS.has(
      model.replace(/-\d{4}-\d{2}-\d{2}$/, ''),
    )
      ? 'models.dev-fallback'
      : MODEL_PRICING_SOURCE,
    version: MODEL_PRICING_VERSION,
  }
}

export function estimateTokenCostUsd(
  model: string,
  usage: TokenUsage,
): number | null {
  return estimateTokenCost(model, usage)?.usd ?? null
}
