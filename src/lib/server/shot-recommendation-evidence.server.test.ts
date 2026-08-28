import { describe, expect, test } from 'bun:test'
import {
  recommendationBeanEvidence,
  recommendationGearEvidence,
  recommendationHistoryIds,
  recommendationShotEvidence,
} from '@/lib/server/shot-recommendation-evidence.server'

describe('AI brew recommendation context', () => {
  test('keeps an older focused brew inside the bounded history', () => {
    const matchingShots = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
    }))

    const ids = recommendationHistoryIds(matchingShots, 60, 50)

    expect(ids).toHaveLength(50)
    expect(ids.slice(0, -1)).toEqual(
      Array.from({ length: 49 }, (_, index) => index + 1),
    )
    expect(ids.at(-1)).toBe(60)
  })

  test('keeps the brewing-relevant bean and exact gear details', () => {
    const roastDate = new Date('2026-08-01T00:00:00.000Z')
    const bean = recommendationBeanEvidence({
      id: 12,
      name: 'Konga',
      roaster: null,
      roasterRef: { name: 'Test Roaster' },
      type: 'espresso',
      origin: 'Ethiopia',
      region: 'Yirgacheffe',
      farm: 'Konga Cooperative',
      variety: 'Heirloom',
      process: 'washed',
      roastLevel: 'light',
      roastDate,
      notes: 'Jasmine and peach',
    })
    const machineSettings = {
      gearId: 4,
      brewPressureOpvBar: '9.00',
      supportsPreinfusion: true,
      defaultPreinfusionEnabled: true,
      defaultPreinfusionTimeSeconds: '5.00',
      defaultPreinfusionPressureBar: '3.00',
      defaultFlowLimitMlPerSecond: '2.00',
      temperatureOffsetCelsius: '1.0',
      volumetricShotVolumeMl: '36.00',
      autoStopMode: 'weight',
      steamTemperatureCelsius: '130.0',
      steamPressureBar: '1.50',
    }
    const machine = recommendationGearEvidence(4, {
      id: 4,
      name: 'Test Machine',
      brand: 'Acme',
      model: 'One',
      type: 'espresso_machine',
      notes: 'Pressure-profile mode enabled',
      machineSettings,
      basketDetails: null,
    })

    expect(bean).toEqual({
      id: 12,
      name: 'Konga',
      roaster: 'Test Roaster',
      type: 'espresso',
      origin: 'Ethiopia',
      region: 'Yirgacheffe',
      farm: 'Konga Cooperative',
      variety: 'Heirloom',
      process: 'washed',
      roastLevel: 'light',
      roastDate,
      notes: 'Jasmine and peach',
    })
    expect(machine).toMatchObject({
      id: 4,
      brand: 'Acme',
      model: 'One',
      notes: 'Pressure-profile mode enabled',
      machineSettings,
    })
  })

  test('keeps the focused brew recipe, parameters, gear IDs, and full tasting outcome', () => {
    const brewedAt = new Date('2026-08-28T08:30:00.000Z')
    const evidence = recommendationShotEvidence(
      {
        id: 42,
        brewedAt,
        brewingMethodId: 3,
        beanId: 12,
        recipeId: 7,
        machineId: 4,
        doseGrams: '18.00',
        brewWaterGrams: null,
        ratioBasis: 'target_yield',
        grinderId: 5,
        grindSetting: '2.5',
        yieldGrams: '40.00',
        shotTimeSeconds: '29.00',
        brewTemperatureCelsius: '93.0',
        preinfusionTimeSeconds: '5.00',
        preinfusionPressureBar: '3.00',
        bloomTimeSeconds: null,
        brewPressureBar: '9.00',
        flowRateMlPerSecond: '2.00',
        basketId: 6,
        usesPuckScreen: true,
        paperFilterPosition: 'bottom',
        distributionMethod: 'WDT',
        tampForceKg: '12.00',
        rating: 4,
        extractionBalance: 2,
        bitterness: 2,
        acidity: 4,
        sweetness: 5,
        body: 3,
        astringency: 1,
        notes: 'Sweet, with a bright finish',
        createdAt: brewedAt,
        updatedAt: brewedAt,
        recipe: { id: 7, name: 'Bright espresso' },
        accessoryGearLinks: [{ gearId: 8 }, { gearId: 9 }],
        tasteTags: [
          {
            tasteTag: {
              name: 'Citrus',
              category: 'fruity',
              extractionAxis: '-0.25',
              strengthAxis: '0.10',
              hint: 'Bright acidity',
            },
          },
        ],
      },
      [
        'machineId',
        'doseGrams',
        'grinderId',
        'grindSetting',
        'yieldGrams',
        'shotTimeSeconds',
        'basketId',
        'accessoryGearIds',
      ],
    )

    expect(evidence).toMatchObject({
      id: 42,
      brewedAt,
      recipe: { id: 7, name: 'Bright espresso' },
      parameters: {
        machineId: 4,
        doseGrams: '18.00',
        grinderId: 5,
        grindSetting: '2.5',
        yieldGrams: '40.00',
        shotTimeSeconds: '29.00',
        basketId: 6,
        accessoryGearIds: [8, 9],
      },
      achievedRatio: '1:2.22',
      overallRating: 4,
      sensory: {
        acidity: 4,
        sweetness: 5,
        bitterness: 2,
        body: 3,
        astringency: 1,
      },
      flavorTags: [
        {
          name: 'Citrus',
          category: 'fruity',
          extractionAxis: '-0.25',
          strengthAxis: '0.10',
          compassHint: 'Bright acidity',
        },
      ],
      tastingNotes: 'Sweet, with a bright finish',
    })
  })
})
