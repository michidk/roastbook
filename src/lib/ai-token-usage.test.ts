import { describe, expect, test } from 'bun:test'
import { addAiTokenUsage, EMPTY_AI_TOKEN_TOTALS } from '@/lib/ai-token-usage'

describe('AI token usage', () => {
  test('adds usage across every model iteration', () => {
    const afterResearch = addAiTokenUsage(EMPTY_AI_TOKEN_TOTALS, {
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 155,
      promptTokensDetails: { cachedTokens: 20 },
      cost: 0.001,
    })

    expect(
      addAiTokenUsage(afterResearch, {
        promptTokens: 80,
        completionTokens: 20,
        totalTokens: 104,
        promptTokensDetails: { cachedTokens: 10 },
        cost: 0.002,
      }),
    ).toEqual({
      promptTokens: 200,
      completionTokens: 50,
      totalTokens: 259,
      promptTokensDetails: { cachedTokens: 30 },
      cost: 0.003,
    })
  })
})
