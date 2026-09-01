import { describe, expect, test } from 'bun:test'
import {
  espressoMachineDetailsSchema,
  espressoMachineSettingsSchema,
  gearPropertyEvidenceSchema,
  grinderDetailsSchema,
  tamperDetailsSchema,
} from '@/lib/gear-property-schemas'

const emptyMachineDetails = {
  portafilterDiameterMm: null,
  heatingArchitecture: null,
  temperatureControl: null,
  pressureControl: null,
  flowControl: null,
  preinfusionControl: null,
  shotStopModes: null,
  steamSystem: null,
  simultaneousBrewAndSteam: null,
  groupCount: null,
  pumpType: null,
  waterSourceModes: null,
  brewPressureMinimumBar: null,
  brewPressureMaximumBar: null,
  brewTemperatureMinimumCelsius: null,
  brewTemperatureMaximumCelsius: null,
}

const emptyMachineSettings = {
  brewPressureBar: null,
  preinfusionEnabled: null,
  preinfusionTimeSeconds: null,
  preinfusionPressureBar: null,
  flowLimitMlPerSecond: null,
  brewTemperatureOffsetCelsius: null,
  programmedVolumeMl: null,
  defaultStopMode: null,
  steamTemperatureCelsius: null,
  steamPressureBar: null,
}

describe('gear property validation', () => {
  test('preserves unknown, known none, false, empty sets, and numeric zero', () => {
    expect(
      espressoMachineDetailsSchema.parse({
        ...emptyMachineDetails,
        flowControl: 'none',
        shotStopModes: [],
        simultaneousBrewAndSteam: false,
      }),
    ).toMatchObject({
      flowControl: 'none',
      shotStopModes: [],
      simultaneousBrewAndSteam: false,
    })
    expect(
      espressoMachineSettingsSchema.parse({
        ...emptyMachineSettings,
        brewPressureBar: '0',
        preinfusionEnabled: false,
        preinfusionTimeSeconds: '0',
        brewTemperatureOffsetCelsius: '-1.5',
      }),
    ).toMatchObject({
      brewPressureBar: '0',
      preinfusionEnabled: false,
      preinfusionTimeSeconds: '0',
      brewTemperatureOffsetCelsius: '-1.5',
    })
  })

  test('keeps every tamper field nullable', () => {
    expect(
      tamperDetailsSchema.parse({
        diameterMm: null,
        forceControl: null,
        baseShape: null,
        selfLeveling: null,
      }),
    ).toEqual({
      diameterMm: null,
      forceControl: null,
      baseShape: null,
      selfLeveling: null,
    })
  })

  test('rejects inverted ranges and duplicate capability values', () => {
    expect(
      espressoMachineDetailsSchema.safeParse({
        ...emptyMachineDetails,
        brewPressureMinimumBar: '10',
        brewPressureMaximumBar: '9',
      }).success,
    ).toBe(false)
    expect(
      espressoMachineDetailsSchema.safeParse({
        ...emptyMachineDetails,
        shotStopModes: ['manual', 'manual'],
      }).success,
    ).toBe(false)
  })

  test('rejects non-positive physical dimensions', () => {
    expect(
      tamperDetailsSchema.safeParse({
        diameterMm: '0',
        forceControl: null,
        baseShape: null,
        selfLeveling: null,
      }).success,
    ).toBe(false)
    expect(
      grinderDetailsSchema.safeParse({
        burrMechanism: null,
        burrDiameterMm: '0',
        adjustmentType: null,
        brewRange: null,
        beanFeed: null,
        doseControlModes: null,
        burrMaterial: null,
      }).success,
    ).toBe(false)
  })

  test('accepts sourced JSON claims only with web URLs', () => {
    const claim = {
      propertyKey: 'specifications.portafilterDiameterMm',
      valueJson: 58,
      sourceTitle: null,
      sourceKind: 'manual' as const,
      rawValue: '58 mm',
      rawUnit: 'mm',
    }
    expect(
      gearPropertyEvidenceSchema.safeParse({
        ...claim,
        sourceUrl: 'https://example.com/manual.pdf',
      }).success,
    ).toBe(true)
    expect(
      gearPropertyEvidenceSchema.safeParse({
        ...claim,
        sourceUrl: 'file:///tmp/manual.pdf',
      }).success,
    ).toBe(false)
  })
})
