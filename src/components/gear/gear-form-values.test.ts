import { describe, expect, test } from 'bun:test'
import {
  createEmptyGearFormValues,
  gearCreatePayload,
  gearFormValuesFrom,
  gearUpdatePayload,
} from '@/components/gear/gear-form-values'

describe('gear form payloads', () => {
  test('requires a type, brand, and model, and normalizes create values', () => {
    expect(() => gearCreatePayload(createEmptyGearFormValues())).toThrow(
      'Choose a gear type',
    )
    expect(() =>
      gearCreatePayload({ ...createEmptyGearFormValues(), type: 'grinder' }),
    ).toThrow('Enter the brand')
    expect(() =>
      gearCreatePayload({
        ...createEmptyGearFormValues(),
        type: 'grinder',
        brand: 'Niche',
      }),
    ).toThrow('Enter the model')

    const payload = gearCreatePayload({
      ...createEmptyGearFormValues(),
      brand: '  Niche  ',
      model: '  Zero  ',
      type: 'grinder',
      priceCurrency: 'BTC',
    })
    expect(payload).toMatchObject({
      brand: 'Niche',
      model: 'Zero',
      type: 'grinder',
      priceCurrency: undefined,
      espressoMachineDetails: null,
      ownerMachineSettings: null,
      basketDetails: null,
      grinderDetails: {
        burrMechanism: null,
        brewRange: null,
      },
    })
  })

  test('separates capabilities, owner settings, and factory defaults', () => {
    const values = {
      ...createEmptyGearFormValues(),
      brand: 'Arc',
      model: 'One',
      type: 'espresso_machine' as const,
      machinePreinfusionControl: 'programmable',
      machineShotStopModes: ['manual', 'volume'],
      ownerPreinfusionEnabled: 'false',
      ownerPreinfusionTimeSeconds: '0',
      ownerBrewPressureBar: '9.00',
      factoryPreinfusionEnabled: 'true',
      factoryDefaultStopMode: 'volume',
    }

    const payload = gearCreatePayload(values)
    expect(payload.espressoMachineDetails).toMatchObject({
      preinfusionControl: 'programmable',
      shotStopModes: ['manual', 'volume'],
    })
    expect(payload.ownerMachineSettings).toMatchObject({
      preinfusionEnabled: false,
      preinfusionTimeSeconds: '0',
      brewPressureBar: '9.00',
    })
    expect(payload.factoryMachineSettings).toMatchObject({
      preinfusionEnabled: true,
      defaultStopMode: 'volume',
    })
  })

  test('preserves unknown separately from known none and false', () => {
    const unknown = gearCreatePayload({
      ...createEmptyGearFormValues(),
      brand: 'Arc',
      model: 'One',
      type: 'espresso_machine',
    })
    const knownNone = gearCreatePayload({
      ...createEmptyGearFormValues(),
      brand: 'Arc',
      model: 'One',
      type: 'espresso_machine',
      machineFlowControl: 'none',
      machineShotStopModes: [],
      machineSimultaneousBrewAndSteam: 'false',
    })

    expect(unknown.espressoMachineDetails).toMatchObject({
      flowControl: null,
      shotStopModes: null,
      simultaneousBrewAndSteam: null,
    })
    expect(knownNone.espressoMachineDetails).toMatchObject({
      flowControl: 'none',
      shotStopModes: [],
      simultaneousBrewAndSteam: false,
    })
  })

  test('keeps every blank tamper property nullable', () => {
    const payload = gearCreatePayload({
      ...createEmptyGearFormValues(),
      brand: 'Pullman',
      model: 'BigStep',
      type: 'tamper',
    })

    expect(payload.tamperDetails).toEqual({
      diameterMm: null,
      forceControl: null,
      baseShape: null,
      selfLeveling: null,
    })
  })

  test('round-trips current setting revisions and subtype values', () => {
    const values = gearFormValuesFrom({
      brand: null,
      model: 'One',
      type: 'espresso_machine',
      purchaseDate: '2026-08-14T00:00:00.000Z',
      purchasePrice: null,
      priceCurrency: 'EUR',
      manualUrl: null,
      productUrl: null,
      notes: null,
      espressoMachineDetails: {
        portafilterDiameterMm: '58.00',
        heatingArchitecture: null,
        temperatureControl: null,
        pressureControl: null,
        flowControl: null,
        preinfusionControl: 'none',
        shotStopModes: [],
        steamSystem: null,
        simultaneousBrewAndSteam: false,
        groupCount: null,
        pumpType: null,
        waterSourceModes: null,
        brewPressureMinimumBar: null,
        brewPressureMaximumBar: null,
        brewTemperatureMinimumCelsius: null,
        brewTemperatureMaximumCelsius: null,
      },
      machineSettingRevisions: [
        {
          kind: 'owner',
          supersededAt: new Date('2026-08-01T00:00:00.000Z'),
          brewPressureBar: '10.00',
          preinfusionEnabled: true,
          preinfusionTimeSeconds: null,
          preinfusionPressureBar: null,
          flowLimitMlPerSecond: null,
          brewTemperatureOffsetCelsius: null,
          programmedVolumeMl: null,
          defaultStopMode: null,
          steamTemperatureCelsius: null,
          steamPressureBar: null,
        },
        {
          kind: 'owner',
          supersededAt: null,
          brewPressureBar: '9.00',
          preinfusionEnabled: false,
          preinfusionTimeSeconds: null,
          preinfusionPressureBar: null,
          flowLimitMlPerSecond: null,
          brewTemperatureOffsetCelsius: '-1.0',
          programmedVolumeMl: null,
          defaultStopMode: null,
          steamTemperatureCelsius: null,
          steamPressureBar: null,
        },
      ],
    })

    expect(values.purchaseDate).toBe('2026-08-14')
    expect(values.machineShotStopModes).toEqual([])
    expect(values.machineSimultaneousBrewAndSteam).toBe('false')
    expect(values.ownerBrewPressureBar).toBe('9.00')
    expect(values.ownerPreinfusionEnabled).toBe('false')
    expect(values.ownerBrewTemperatureOffsetCelsius).toBe('-1.0')
  })

  test('combined machines own both machine and grinder details', () => {
    const payload = gearCreatePayload({
      ...createEmptyGearFormValues(),
      brand: 'Sage',
      model: 'Barista',
      type: 'espresso_machine_with_grinder',
      machinePortafilterDiameterMm: '54',
      grinderBurrMechanism: 'conical',
      grinderGrindSettingFormat: 'decimal',
      grinderGrindSettingMinimum: '2.5',
      grinderGrindSettingMaximum: '12',
    })

    expect(payload.espressoMachineDetails?.portafilterDiameterMm).toBe('54')
    expect(payload.grinderDetails?.burrMechanism).toBe('conical')
    expect(payload.grinderDetails?.grindSettingFormat).toBe('decimal')
    expect(payload.grinderDetails?.grindSettingMinimum).toBe('2.5')
    expect(payload.grinderDetails?.grindSettingMaximum).toBe('12')
  })

  test('adds explicit confirmation only for a confirmed type change', () => {
    const values = {
      ...createEmptyGearFormValues(),
      brand: 'Arc',
      model: 'One',
      type: 'scale' as const,
    }

    expect(gearUpdatePayload(8, values).confirmTypeChange).toBeUndefined()
    expect(gearUpdatePayload(8, values, true).confirmTypeChange).toBe(true)
  })
})
