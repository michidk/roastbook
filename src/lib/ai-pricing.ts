import type { TokenUsage } from '@tanstack/ai'

type ModelTokenRates = {
  readonly input: number
  readonly cachedInput: number
  readonly output: number
}

// OpenAI standard API prices in USD per one million tokens. Unknown or
// custom-endpoint models still have their tokens tracked without attaching a
// potentially misleading cost estimate.
const MODEL_TOKEN_RATES: Readonly<Record<string, ModelTokenRates>> = {
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
}

export function estimateTokenCostUsd(
  model: string,
  usage: TokenUsage,
): number | null {
  if (usage.cost !== undefined && Number.isFinite(usage.cost)) {
    return Math.max(0, usage.cost)
  }

  const rates = MODEL_TOKEN_RATES[model]
  if (!rates) return null

  const cachedTokens = Math.min(
    usage.promptTokens,
    usage.promptTokensDetails?.cachedTokens ?? 0,
  )
  const regularInputTokens = usage.promptTokens - cachedTokens

  return (
    (regularInputTokens * rates.input +
      cachedTokens * rates.cachedInput +
      usage.completionTokens * rates.output) /
    1_000_000
  )
}
