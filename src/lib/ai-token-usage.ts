import type { TokenUsage } from '@tanstack/ai'

export type AiTokenTotals = Pick<
  TokenUsage,
  'promptTokens' | 'completionTokens' | 'totalTokens'
>

export const EMPTY_AI_TOKEN_TOTALS: AiTokenTotals = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
}

export function addAiTokenUsage(
  current: AiTokenTotals,
  next: TokenUsage,
): AiTokenTotals {
  return {
    promptTokens: current.promptTokens + next.promptTokens,
    completionTokens: current.completionTokens + next.completionTokens,
    totalTokens: current.totalTokens + next.totalTokens,
  }
}
