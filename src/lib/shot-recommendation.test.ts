import { describe, expect, test } from 'bun:test'
import {
  buildShotRecommendationPrompt,
  haveSameAccessoryGear,
  shotRecommendationRequestSchema,
  shotRecommendationSchema,
} from '@/lib/shot-recommendation'

describe('brew recommendation evidence', () => {
  test('matches accessory gear as an exact set regardless of order', () => {
    expect(haveSameAccessoryGear([4, 2], [2, 4])).toBe(true)
    expect(haveSameAccessoryGear([4, 2], [2, 4, 8])).toBe(false)
    expect(haveSameAccessoryGear([4, 4, 2], [2, 4])).toBe(true)
  })

  test('accepts a bean request scoped to the selected brewing method', () => {
    expect(
      shotRecommendationRequestSchema.parse({ beanId: 12, brewingMethodId: 3 }),
    ).toEqual({ beanId: 12, brewingMethodId: 3 })
  })

  test('builds a constrained prompt with chronological evidence', () => {
    const prompt = buildShotRecommendationPrompt({
      bean: { name: 'Test bean' },
      brewingMethod: { name: 'Espresso' },
      exactGear: { grinder: { name: 'Test grinder' } },
      enabledParameters: ['doseGrams', 'yieldGrams', 'grindSetting'],
      matchingShotCount: 2,
      historyIncluded: 2,
      historyTruncated: false,
      shotsOldestToNewest: [
        { id: 1, overallRating: 2, flavorTags: ['Salty'] },
        { id: 2, overallRating: 4, flavorTags: ['Balanced'] },
      ],
    })

    expect(prompt).toContain('one exact equipment combination')
    expect(prompt).toContain('same bean, brewing method, machine or brewer')
    expect(prompt).toContain('When changing yield, keep dose fixed')
    expect(prompt).toContain('by themselves they do not diagnose')
    expect(prompt).toContain('return no changes')
    expect(prompt.indexOf('"id": 1')).toBeLessThan(prompt.indexOf('"id": 2'))
  })

  test('accepts at most three actionable changes', () => {
    const base = {
      diagnosis: 'balanced' as const,
      confidence: 'high' as const,
      headline: 'Repeat this brew',
      summary: 'The latest brew is the strongest result.',
      historyInsight: 'Ratings improved as yield increased.',
      keepConstant: [],
      caveat: 'Taste the next brew before changing another variable.',
    }
    const change = {
      parameter: 'yieldGrams' as const,
      currentValue: '36 g',
      recommendedValue: '38 g',
      reason: 'Extract slightly more while keeping dose fixed.',
    }

    expect(
      shotRecommendationSchema.safeParse({ ...base, changes: [change] })
        .success,
    ).toBe(true)
    expect(
      shotRecommendationSchema.safeParse({
        ...base,
        changes: [change, change, change, change],
      }).success,
    ).toBe(false)
  })
})
