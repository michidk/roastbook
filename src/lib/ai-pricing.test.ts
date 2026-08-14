import { describe, expect, test } from 'bun:test'
import { estimateTokenCostUsd } from '@/lib/ai-pricing'

describe('AI token cost estimates', () => {
  test('estimates standard and cached GPT-4o tokens', () => {
    expect(
      estimateTokenCostUsd('gpt-4o', {
        promptTokens: 1_000_000,
        completionTokens: 100_000,
        totalTokens: 1_100_000,
        promptTokensDetails: { cachedTokens: 200_000 },
      }),
    ).toBe(3.25)
  })

  test('prefers a provider-reported cost', () => {
    expect(
      estimateTokenCostUsd('custom-model', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: 0.0123,
      }),
    ).toBe(0.0123)
  })

  test('does not guess a price for an unknown model', () => {
    expect(
      estimateTokenCostUsd('custom-model', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      }),
    ).toBeNull()
  })
})
