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

  test('accepts a request focused on one saved brew', () => {
    expect(shotRecommendationRequestSchema.parse({ shotId: 42 })).toEqual({
      shotId: 42,
    })
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

  test('keeps a saved brew as the subject while injecting its full context', () => {
    const prompt = buildShotRecommendationPrompt({
      bean: {
        name: 'Test bean',
        origin: 'Ethiopia',
        process: 'washed',
        roastLevel: 'light',
      },
      brewingMethod: {
        name: 'Espresso',
        description: 'Pressure extraction',
      },
      exactGear: {
        machineOrBrewer: {
          name: 'Test machine',
          currentOwnerSettings: { brewPressureBar: '9.00' },
        },
        grinder: { name: 'Test grinder', model: 'G1' },
      },
      focusedShot: {
        id: 42,
        brewedAt: '2026-08-28T08:30:00.000Z',
        parameters: { doseGrams: '18.00', yieldGrams: '40.00' },
        overallRating: 4,
        tastingNotes: 'Sweet and bright',
      },
      currentDraft: null,
      enabledParameters: ['doseGrams', 'yieldGrams', 'grindSetting'],
      matchingShotCount: 2,
      historyIncluded: 2,
      historyTruncated: false,
      shotsOldestToNewest: [
        { id: 41, brewedAt: '2026-08-27T08:30:00.000Z' },
        { id: 42, brewedAt: '2026-08-28T08:30:00.000Z' },
      ],
    })

    expect(prompt).toContain('exact completed brew the user asked about')
    expect(prompt).toContain('even when newer matching brews exist')
    expect(prompt).toContain('chronologically by brewedAt')
    expect(prompt).toContain('"focusedShot"')
    expect(prompt).toContain('"origin": "Ethiopia"')
    expect(prompt).toContain('"currentOwnerSettings"')
    expect(prompt).toContain('"tastingNotes": "Sweet and bright"')
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
