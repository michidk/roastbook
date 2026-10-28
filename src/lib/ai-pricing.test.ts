import { describe, expect, test } from 'bun:test'
import { OPENAI_CHAT_MODELS } from '@tanstack/ai-openai'
import {
  MODEL_PRICING_SOURCE,
  MODEL_PRICING_VERSION,
  MODEL_TOKEN_RATES,
} from '@/lib/ai-model-pricing'
import { estimateTokenCost, estimateTokenCostUsd } from '@/lib/ai-pricing'

describe('AI token cost estimates', () => {
  test('records the catalog source and version for estimates', () => {
    expect(
      estimateTokenCost('gpt-4o', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      }),
    ).toMatchObject({
      source: MODEL_PRICING_SOURCE,
      version: MODEL_PRICING_VERSION,
    })
  })

  test('marks documented fallback rates separately', () => {
    expect(
      estimateTokenCost('gpt-5-chat-latest', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      }),
    ).toMatchObject({ source: 'models.dev-fallback' })
  })

  test('covers every TanStack OpenAI chat model', () => {
    for (const model of OPENAI_CHAT_MODELS) {
      expect(MODEL_TOKEN_RATES[model]).toBeDefined()
    }
  })
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

  test('estimates GPT-5.1 tokens including cached input', () => {
    expect(
      estimateTokenCostUsd('gpt-5.1', {
        promptTokens: 6_368,
        completionTokens: 204,
        totalTokens: 6_572,
        promptTokensDetails: { cachedTokens: 6_016 },
      }),
    ).toBeCloseTo(0.003232)
  })

  test('uses long-context rates above the catalog threshold', () => {
    expect(
      estimateTokenCostUsd('gpt-5.6-sol', {
        promptTokens: 300_000,
        completionTokens: 1_000,
        totalTokens: 301_000,
      }),
    ).toBeCloseTo(2.43)
  })

  test('uses base rates below the long-context threshold', () => {
    expect(
      estimateTokenCostUsd('gpt-5.6-sol', {
        promptTokens: 1_000,
        completionTokens: 100,
        totalTokens: 1_100,
      }),
    ).toBeCloseTo(0.006)
  })

  test('matches dated GPT-5.1 snapshot names', () => {
    expect(
      estimateTokenCostUsd('gpt-5.1-2025-11-13', {
        promptTokens: 1_000_000,
        completionTokens: 100_000,
        totalTokens: 1_100_000,
        promptTokensDetails: { cachedTokens: 200_000 },
      }),
    ).toBe(2.025)
  })

  test('prefers a provider-reported cost', () => {
    expect(
      estimateTokenCost('custom-model', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: 0.0123,
      }),
    ).toEqual({ usd: 0.0123, source: 'provider', version: null })
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
