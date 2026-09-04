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
      id: 14,
      gearId: 4,
      kind: 'owner',
      brewPressureBar: '9.00',
      preinfusionEnabled: true,
      preinfusionTimeSeconds: '5.00',
      preinfusionPressureBar: '3.00',
      flowLimitMlPerSecond: '2.00',
      brewTemperatureOffsetCelsius: '1.0',
      programmedVolumeMl: '36.00',
      defaultStopMode: 'weight',
      steamTemperatureCelsius: '130.0',
      steamPressureBar: '1.50',
      effectiveFrom: roastDate,
      supersededAt: null,
      createdAt: roastDate,
    }
    const machine = recommendationGearEvidence(4, {
      id: 4,
      name: 'Test Machine',
      brand: 'Acme',
      model: 'One',
      type: 'espresso_machine',
      notes: 'Pressure-profile mode enabled',
      espressoMachineDetails: null,
      machineSettingRevisions: [machineSettings],
      grinderDetails: null,
      brewerDetails: null,
      kettleDetails: null,
      scaleDetails: null,
      tamperDetails: null,
      wdtDetails: null,
      basketDetails: null,
    })
    const grinder = recommendationGearEvidence(5, {
      id: 5,
      name: 'Test Grinder',
      brand: 'Acme',
      model: 'One',
      type: 'grinder',
      notes: 'Single-dose grinder',
      espressoMachineDetails: null,
      machineSettingRevisions: [],
      grinderDetails: {
        gearId: 5,
        burrMechanism: 'conical',
        burrDiameterMm: '64.00',
        adjustmentType: 'stepless',
        grindSettingFormat: 'decimal',
        grindSettingMinimum: '2.500',
        grindSettingMaximum: '12.000',
        brewRange: ['espresso'],
        beanFeed: 'single_dose',
        doseControlModes: ['manual'],
        burrMaterial: 'steel',
      },
      brewerDetails: null,
      kettleDetails: null,
      scaleDetails: null,
      tamperDetails: null,
      wdtDetails: null,
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
      currentOwnerSettings: machineSettings,
    })
    expect(grinder).toMatchObject({
      id: 5,
      brand: 'Acme',
      model: 'One',
      notes: 'Single-dose grinder',
      grinderDetails: {
        grindSettingFormat: 'decimal',
        grindSettingMinimum: '2.500',
        grindSettingMaximum: '12.000',
      },
    })
  })

  test('keeps the focused brew parameters, gear IDs, and full tasting outcome', () => {
    const brewedAt = new Date('2026-08-28T08:30:00.000Z')
    const evidence = recommendationShotEvidence(
      {
        id: 42,
        brewedAt,
        brewingMethodId: 3,
        beanId: 12,
        drinkTypeId: null,
        machineSettingRevisionId: 14,
        machineId: 4,
        doseGrams: '18.00',
        brewWaterGrams: null,
        ratioBasis: 'target_yield',
        grinderId: 5,
        grindSetting: '2.5',
        yieldGrams: '40.00',
        shotTimeSeconds: '29.00',
        targetTimeSeconds: '30.00',
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
        machineSettingRevision: {
          id: 14,
          gearId: 4,
          kind: 'owner',
          brewPressureBar: '9.00',
          preinfusionEnabled: true,
          preinfusionTimeSeconds: '5.00',
          preinfusionPressureBar: '3.00',
          flowLimitMlPerSecond: '2.00',
          brewTemperatureOffsetCelsius: null,
          programmedVolumeMl: null,
          defaultStopMode: null,
          steamTemperatureCelsius: null,
          steamPressureBar: null,
          effectiveFrom: brewedAt,
          supersededAt: null,
          createdAt: brewedAt,
        },
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
        'targetTimeSeconds',
        'basketId',
        'accessoryGearIds',
      ],
    )

    expect(evidence).toMatchObject({
      id: 42,
      brewedAt,
      machineSettingRevision: {
        id: 14,
        brewPressureBar: '9.00',
      },
      parameters: {
        machineId: 4,
        doseGrams: '18.00',
        grinderId: 5,
        grindSetting: '2.5',
        yieldGrams: '40.00',
        shotTimeSeconds: '29.00',
        targetTimeSeconds: '30.00',
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
