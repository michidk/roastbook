import type { TokenUsage } from '@tanstack/ai'

export type AiTokenTotals = TokenUsage

export const EMPTY_AI_TOKEN_TOTALS: AiTokenTotals = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
}

export function addAiTokenUsage(
  current: AiTokenTotals,
  next: TokenUsage,
): AiTokenTotals {
  const cachedTokens =
    (current.promptTokensDetails?.cachedTokens ?? 0) +
    (next.promptTokensDetails?.cachedTokens ?? 0)
  const cost =
    current.cost === undefined && next.cost === undefined
      ? undefined
      : (current.cost ?? 0) + (next.cost ?? 0)

  return {
    promptTokens: current.promptTokens + next.promptTokens,
    completionTokens: current.completionTokens + next.completionTokens,
    totalTokens: current.totalTokens + next.totalTokens,
    ...(cachedTokens > 0
      ? { promptTokensDetails: { cachedTokens } }
      : undefined),
    ...(cost === undefined ? undefined : { cost }),
  }
}
