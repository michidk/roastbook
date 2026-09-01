import { z } from 'zod'
import {
  AUTO_STOP_MODE_VALUES,
  BASKET_KIND_VALUES,
  BREWER_FLOW_CONTROL_VALUES,
  BREWER_MECHANISM_VALUES,
  GEAR_PROPERTY_SOURCE_KIND_VALUES,
  GRINDER_ADJUSTMENT_TYPE_VALUES,
  GRINDER_BEAN_FEED_VALUES,
  GRINDER_BREW_RANGE_VALUES,
  GRINDER_BURR_MATERIAL_VALUES,
  GRINDER_BURR_MECHANISM_VALUES,
  GRINDER_DOSE_CONTROL_MODE_VALUES,
  KETTLE_SPOUT_TYPE_VALUES,
  KETTLE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_FLOW_CONTROL_VALUES,
  MACHINE_HEATING_ARCHITECTURE_VALUES,
  MACHINE_PREINFUSION_CONTROL_VALUES,
  MACHINE_PRESSURE_CONTROL_VALUES,
  MACHINE_PUMP_TYPE_VALUES,
  MACHINE_STEAM_SYSTEM_VALUES,
  MACHINE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_WATER_SOURCE_VALUES,
  TAMPER_BASE_SHAPE_VALUES,
  TAMPER_FORCE_CONTROL_VALUES,
  WDT_DEPTH_CONTROL_VALUES,
} from '@/lib/domain-contracts'
import { boundedDecimalStringSchema } from '@/lib/server-validation'

const nullableDecimal = (maximum: number, fractionDigits: number) =>
  boundedDecimalStringSchema(maximum, fractionDigits).nullable()

const nullablePositiveDecimal = (maximum: number, fractionDigits: number) =>
  boundedDecimalStringSchema(maximum, fractionDigits)
    .refine((value) => Number(value) > 0, 'Expected a value greater than zero')
    .nullable()

const nullableSignedDecimal = (maximum: number, fractionDigits: number) =>
  z
    .string()
    .trim()
    .regex(/^-?\d+(?:\.\d+)?$/, 'Expected a decimal number')
    .refine((value) => {
      const fraction = value.split('.')[1]
      return (
        Math.abs(Number(value)) <= maximum &&
        (fraction === undefined || fraction.length <= fractionDigits)
      )
    }, `Expected a value between -${maximum} and ${maximum} with at most ${fractionDigits} decimal places`)
    .nullable()

const nullableEnumSet = <const TValues extends readonly string[]>(
  values: TValues,
) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .refine(
      (items) => new Set(items).size === items.length,
      'Choose each value at most once',
    )
    .nullable()

const nullableBoolean = z.boolean().nullable()
const nullableShortText = z.string().trim().min(1).max(200).nullable()

function addRangeIssue(
  context: z.core.$RefinementCtx,
  path: string,
  label: string,
) {
  context.addIssue({
    code: 'custom',
    path: [path],
    message: `${label} must be greater than or equal to the minimum`,
  })
}

export const espressoMachineDetailsSchema = z
  .object({
    portafilterDiameterMm: nullablePositiveDecimal(999.99, 2),
    heatingArchitecture: z.enum(MACHINE_HEATING_ARCHITECTURE_VALUES).nullable(),
    temperatureControl: z.enum(MACHINE_TEMPERATURE_CONTROL_VALUES).nullable(),
    pressureControl: z.enum(MACHINE_PRESSURE_CONTROL_VALUES).nullable(),
    flowControl: z.enum(MACHINE_FLOW_CONTROL_VALUES).nullable(),
    preinfusionControl: z.enum(MACHINE_PREINFUSION_CONTROL_VALUES).nullable(),
    shotStopModes: nullableEnumSet(AUTO_STOP_MODE_VALUES),
    steamSystem: z.enum(MACHINE_STEAM_SYSTEM_VALUES).nullable(),
    simultaneousBrewAndSteam: nullableBoolean,
    groupCount: z.number().int().positive().max(100).nullable(),
    pumpType: z.enum(MACHINE_PUMP_TYPE_VALUES).nullable(),
    waterSourceModes: nullableEnumSet(MACHINE_WATER_SOURCE_VALUES),
    brewPressureMinimumBar: nullableDecimal(99.99, 2),
    brewPressureMaximumBar: nullableDecimal(99.99, 2),
    brewTemperatureMinimumCelsius: nullableSignedDecimal(999.9, 1),
    brewTemperatureMaximumCelsius: nullableSignedDecimal(999.9, 1),
  })
  .superRefine((value, context) => {
    if (
      value.brewPressureMinimumBar !== null &&
      value.brewPressureMaximumBar !== null &&
      Number(value.brewPressureMinimumBar) >
        Number(value.brewPressureMaximumBar)
    ) {
      addRangeIssue(context, 'brewPressureMaximumBar', 'Maximum brew pressure')
    }
    if (
      value.brewTemperatureMinimumCelsius !== null &&
      value.brewTemperatureMaximumCelsius !== null &&
      Number(value.brewTemperatureMinimumCelsius) >
        Number(value.brewTemperatureMaximumCelsius)
    ) {
      addRangeIssue(
        context,
        'brewTemperatureMaximumCelsius',
        'Maximum brew temperature',
      )
    }
  })

export const espressoMachineSettingsSchema = z.object({
  brewPressureBar: nullableDecimal(99.99, 2),
  preinfusionEnabled: nullableBoolean,
  preinfusionTimeSeconds: nullableDecimal(999.99, 2),
  preinfusionPressureBar: nullableDecimal(99.99, 2),
  flowLimitMlPerSecond: nullableDecimal(99.99, 2),
  brewTemperatureOffsetCelsius: nullableSignedDecimal(999.9, 1),
  programmedVolumeMl: nullablePositiveDecimal(9999.99, 2),
  defaultStopMode: z.enum(AUTO_STOP_MODE_VALUES).nullable(),
  steamTemperatureCelsius: nullablePositiveDecimal(999.9, 1),
  steamPressureBar: nullableDecimal(99.99, 2),
})

export const grinderDetailsSchema = z.object({
  burrMechanism: z.enum(GRINDER_BURR_MECHANISM_VALUES).nullable(),
  burrDiameterMm: nullablePositiveDecimal(999.99, 2),
  adjustmentType: z.enum(GRINDER_ADJUSTMENT_TYPE_VALUES).nullable(),
  brewRange: nullableEnumSet(GRINDER_BREW_RANGE_VALUES),
  beanFeed: z.enum(GRINDER_BEAN_FEED_VALUES).nullable(),
  doseControlModes: nullableEnumSet(GRINDER_DOSE_CONTROL_MODE_VALUES),
  burrMaterial: z.enum(GRINDER_BURR_MATERIAL_VALUES).nullable(),
})

export const brewerDetailsSchema = z.object({
  mechanism: z.enum(BREWER_MECHANISM_VALUES).nullable(),
  capacityMl: nullablePositiveDecimal(99_999.99, 2),
  filterFormat: nullableShortText,
  flowControl: z.enum(BREWER_FLOW_CONTROL_VALUES).nullable(),
})

export const kettleDetailsSchema = z
  .object({
    capacityMl: nullablePositiveDecimal(99_999.99, 2),
    spoutType: z.enum(KETTLE_SPOUT_TYPE_VALUES).nullable(),
    temperatureControl: z.enum(KETTLE_TEMPERATURE_CONTROL_VALUES).nullable(),
    minimumTemperatureCelsius: nullableDecimal(999.9, 1),
    maximumTemperatureCelsius: nullableDecimal(999.9, 1),
    supportsTemperatureHold: nullableBoolean,
  })
  .superRefine((value, context) => {
    if (
      value.minimumTemperatureCelsius !== null &&
      value.maximumTemperatureCelsius !== null &&
      Number(value.minimumTemperatureCelsius) >
        Number(value.maximumTemperatureCelsius)
    ) {
      addRangeIssue(context, 'maximumTemperatureCelsius', 'Maximum temperature')
    }
  })

export const scaleDetailsSchema = z.object({
  resolutionGrams: nullablePositiveDecimal(9999.999, 3),
  capacityGrams: nullablePositiveDecimal(9_999_999.99, 2),
  hasTimer: nullableBoolean,
  supportsAutoTare: nullableBoolean,
  supportsAutoTimer: nullableBoolean,
  hasFlowRateDisplay: nullableBoolean,
})

export const tamperDetailsSchema = z.object({
  diameterMm: nullablePositiveDecimal(999.99, 2),
  forceControl: z.enum(TAMPER_FORCE_CONTROL_VALUES).nullable(),
  baseShape: z.enum(TAMPER_BASE_SHAPE_VALUES).nullable(),
  selfLeveling: nullableBoolean,
})

export const wdtDetailsSchema = z.object({
  needleDiameterMm: nullablePositiveDecimal(99.999, 3),
  needleCount: z.number().int().positive().max(1_000).nullable(),
  depthControl: z.enum(WDT_DEPTH_CONTROL_VALUES).nullable(),
})

export const basketDetailsSchema = z
  .object({
    nominalDoseGrams: nullablePositiveDecimal(999.99, 2),
    diameterMm: nullablePositiveDecimal(999.99, 2),
    isPressurized: nullableBoolean,
    doseMinimumGrams: nullablePositiveDecimal(999.99, 2),
    doseMaximumGrams: nullablePositiveDecimal(999.99, 2),
    kind: z.enum(BASKET_KIND_VALUES).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.doseMinimumGrams !== null &&
      value.doseMaximumGrams !== null &&
      Number(value.doseMinimumGrams) > Number(value.doseMaximumGrams)
    ) {
      addRangeIssue(context, 'doseMaximumGrams', 'Maximum dose')
    }
  })

export const gearPropertyEvidenceSchema = z.object({
  propertyKey: z.string().trim().min(1).max(200),
  valueJson: z.json(),
  sourceUrl: z
    .url()
    .max(2_048)
    .refine(
      (value) => value.startsWith('https://') || value.startsWith('http://'),
      'Expected an HTTP or HTTPS URL',
    ),
  sourceTitle: z.string().trim().max(500).nullable(),
  sourceKind: z.enum(GEAR_PROPERTY_SOURCE_KIND_VALUES),
  rawValue: z.string().trim().max(500).nullable(),
  rawUnit: z.string().trim().max(50).nullable(),
})

export type EspressoMachineDetailsInput = z.infer<
  typeof espressoMachineDetailsSchema
>
export type EspressoMachineSettingsInput = z.infer<
  typeof espressoMachineSettingsSchema
>
export type GrinderDetailsInput = z.infer<typeof grinderDetailsSchema>
export type BrewerDetailsInput = z.infer<typeof brewerDetailsSchema>
export type KettleDetailsInput = z.infer<typeof kettleDetailsSchema>
export type ScaleDetailsInput = z.infer<typeof scaleDetailsSchema>
export type TamperDetailsInput = z.infer<typeof tamperDetailsSchema>
export type WdtDetailsInput = z.infer<typeof wdtDetailsSchema>
export type BasketDetailsInput = z.infer<typeof basketDetailsSchema>
export type GearPropertyEvidenceInput = z.infer<
  typeof gearPropertyEvidenceSchema
>
