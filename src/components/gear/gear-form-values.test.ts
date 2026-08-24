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
      machineSettings: null,
      basketDetails: null,
    })
  })

  test('maps machine settings consistently for create and update', () => {
    const values = {
      ...createEmptyGearFormValues(),
      brand: 'Arc',
      model: 'One',
      type: 'espresso_machine' as const,
      supportsPreinfusion: 'true',
      autoStopMode: 'volume',
      brewPressureOpvBar: '9.00',
    }

    expect(gearCreatePayload(values).machineSettings).toMatchObject({
      supportsPreinfusion: true,
      autoStopMode: 'volume',
      brewPressureOpvBar: '9.00',
    })
    expect(gearUpdatePayload(8, values)).toMatchObject({
      id: 8,
      machineSettings: {
        supportsPreinfusion: true,
        autoStopMode: 'volume',
      },
    })
  })

  test('round-trips persisted form values', () => {
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
      machineSettings: {
        brewPressureOpvBar: null,
        supportsPreinfusion: false,
        defaultPreinfusionEnabled: null,
        defaultPreinfusionTimeSeconds: null,
        defaultPreinfusionPressureBar: null,
        defaultFlowLimitMlPerSecond: null,
        temperatureOffsetCelsius: null,
        volumetricShotVolumeMl: null,
        autoStopMode: null,
        steamTemperatureCelsius: null,
        steamPressureBar: null,
      },
      basketDetails: null,
    })

    expect(values.purchaseDate).toBe('2026-08-14')
    expect(values.supportsPreinfusion).toBe('false')
    expect(values.defaultPreinfusionEnabled).toBe('')
  })
})
