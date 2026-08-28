import { describe, expect, test } from 'bun:test'
import {
  buildShotRecommendationPrompt,
  shotRecommendationRequestSchema,
} from '@/lib/shot-recommendation'

describe('draft brew recommendation evidence', () => {
  test('accepts the current setup and populated parameters', () => {
    expect(
      shotRecommendationRequestSchema.parse({
        beanId: 12,
        brewingMethodId: 3,
        currentDraft: {
          machineId: 4,
          grinderId: 5,
          basketId: null,
          accessoryGearIds: [8, 9],
          parameters: {
            doseGrams: '18',
            yieldGrams: '40',
            usesPuckScreen: false,
          },
        },
      }),
    ).toEqual({
      beanId: 12,
      brewingMethodId: 3,
      currentDraft: {
        machineId: 4,
        grinderId: 5,
        basketId: null,
        accessoryGearIds: [8, 9],
        parameters: {
          doseGrams: '18',
          yieldGrams: '40',
          usesPuckScreen: false,
        },
      },
    })
  })

  test('requires a brewing method for a current draft', () => {
    expect(
      shotRecommendationRequestSchema.safeParse({
        beanId: 12,
        currentDraft: {
          machineId: null,
          grinderId: null,
          basketId: null,
          accessoryGearIds: [],
          parameters: {},
        },
      }).success,
    ).toBe(false)
  })

  test('treats a current draft as an untasted recommendation baseline', () => {
    const prompt = buildShotRecommendationPrompt({
      bean: { name: 'Test bean' },
      brewingMethod: { name: 'Espresso' },
      exactGear: { grinder: { name: 'Test grinder' } },
      currentDraft: { parameters: { doseGrams: '18', yieldGrams: '40' } },
      enabledParameters: ['doseGrams', 'yieldGrams', 'grindSetting'],
      matchingShotCount: 0,
      historyIncluded: 0,
      historyTruncated: false,
      shotsOldestToNewest: [],
    })

    expect(prompt).toContain("user's proposed brew before tasting")
    expect(prompt).toContain('"doseGrams": "18"')
    expect(prompt).toContain('no matching history')
  })
})
