import { DISTRIBUTION_METHOD_VALUES } from '@/lib/domain-contracts'

export const SHOT_PARAMETER_KEYS = [
  'machineId',
  'doseGrams',
  'brewWaterGrams',
  'ratioBasis',
  'grinderId',
  'grindSetting',
  'yieldGrams',
  'shotTimeSeconds',
  'targetTimeSeconds',
  'brewTemperatureCelsius',
  'preinfusionTimeSeconds',
  'preinfusionPressureBar',
  'bloomTimeSeconds',
  'brewPressureBar',
  'flowRateMlPerSecond',
  'basketId',
  'usesPuckScreen',
  'paperFilterPosition',
  'distributionMethod',
  'tampForceKg',
  'accessoryGearIds',
] as const

export type ShotParameterKey = (typeof SHOT_PARAMETER_KEYS)[number]

export const SHOT_PARAMETER_META = {
  machineId: { label: 'Brewer / machine', group: 'Equipment' },
  doseGrams: { label: 'Dose', group: 'Extraction' },
  brewWaterGrams: { label: 'Brew water', group: 'Extraction' },
  ratioBasis: { label: 'Ratio basis', group: 'Extraction' },
  grinderId: { label: 'Grinder', group: 'Equipment' },
  grindSetting: { label: 'Grind setting', group: 'Extraction' },
  yieldGrams: { label: 'Yield', group: 'Extraction' },
  shotTimeSeconds: { label: 'Brew time', group: 'Extraction' },
  targetTimeSeconds: { label: 'Target time', group: 'Extraction' },
  brewTemperatureCelsius: { label: 'Brew temperature', group: 'Extraction' },
  preinfusionTimeSeconds: { label: 'Pre-infusion time', group: 'Preparation' },
  preinfusionPressureBar: {
    label: 'Pre-infusion pressure',
    group: 'Preparation',
  },
  bloomTimeSeconds: { label: 'Bloom time', group: 'Preparation' },
  brewPressureBar: { label: 'Brew pressure', group: 'Extraction' },
  flowRateMlPerSecond: { label: 'Flow rate', group: 'Extraction' },
  basketId: { label: 'Basket', group: 'Equipment' },
  usesPuckScreen: { label: 'Puck screen', group: 'Preparation' },
  paperFilterPosition: { label: 'Paper filter', group: 'Preparation' },
  distributionMethod: { label: 'Distribution method', group: 'Preparation' },
  tampForceKg: { label: 'Tamp force', group: 'Preparation' },
  accessoryGearIds: { label: 'Other equipment', group: 'Equipment' },
} as const satisfies Record<
  ShotParameterKey,
  { readonly label: string; readonly group: string }
>

export const RATIO_BASIS_OPTIONS = [
  { value: 'target_yield', label: 'Yield' },
  { value: 'brew_water', label: 'Brew water' },
] as const

export type RatioBasis = (typeof RATIO_BASIS_OPTIONS)[number]['value']

export const PAPER_FILTER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'both', label: 'Top and bottom' },
] as const

export type PaperFilterPosition = (typeof PAPER_FILTER_OPTIONS)[number]['value']

export const DISTRIBUTION_METHOD_OPTIONS = DISTRIBUTION_METHOD_VALUES.map(
  (value) => ({ value, label: value }),
)

export type DistributionMethod = (typeof DISTRIBUTION_METHOD_VALUES)[number]

export function isDistributionMethod(
  value: string,
): value is DistributionMethod {
  return DISTRIBUTION_METHOD_VALUES.some((method) => method === value)
}

export type ShotParameterValues = {
  readonly brewingMethodId: number
  readonly beanId: number | null
  readonly machineId: number | null
  readonly doseGrams: string | null
  readonly brewWaterGrams: string | null
  readonly ratioBasis: RatioBasis | null
  readonly grinderId: number | null
  readonly grindSetting: string | null
  readonly yieldGrams: string | null
  readonly shotTimeSeconds: string | null
  readonly targetTimeSeconds: string | null
  readonly brewTemperatureCelsius: string | null
  readonly preinfusionTimeSeconds: string | null
  readonly preinfusionPressureBar: string | null
  readonly bloomTimeSeconds: string | null
  readonly brewPressureBar: string | null
  readonly flowRateMlPerSecond: string | null
  readonly basketId: number | null
  readonly usesPuckScreen: boolean | null
  readonly paperFilterPosition: PaperFilterPosition | null
  readonly distributionMethod: DistributionMethod | null
  readonly tampForceKg: string | null
  readonly accessoryGearIds: readonly number[]
}

type SelectParameterValues = Pick<ShotParameterValues, ShotParameterKey>

export type ShotParameterInput = Partial<
  Omit<
    SelectParameterValues,
    'ratioBasis' | 'paperFilterPosition' | 'distributionMethod'
  >
> & {
  readonly ratioBasis?: string | null
  readonly paperFilterPosition?: string | null
  readonly distributionMethod?: string | null
}

export function isShotParameterKey(value: unknown): value is ShotParameterKey {
  return (
    typeof value === 'string' &&
    SHOT_PARAMETER_KEYS.some((key) => key === value)
  )
}
