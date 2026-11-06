import type {
  BrewParameter,
  EquipmentType,
} from '@roastbook/open-coffee-schema'
import type { GearType } from '@/lib/constants'
import type { RatioBasis, ShotParameterKey } from '@/lib/shot-parameters'

// Equipment choices and the ratio basis have no parameter of their own.
const OPEN_COFFEE_PARAMETERS = {
  doseGrams: 'dose_g',
  brewWaterGrams: 'brew_water_g',
  yieldGrams: 'yield_g',
  grindSetting: 'grind_setting',
  shotTimeSeconds: 'brew_time_seconds',
  targetTimeSeconds: 'target_time_seconds',
  steepTimeSeconds: 'steep_time_seconds',
  brewTemperatureCelsius: 'brew_temperature_celsius',
  preinfusionTimeSeconds: 'preinfusion_time_seconds',
  preinfusionPressureBar: 'preinfusion_pressure_bar',
  bloomTimeSeconds: 'bloom_time_seconds',
  bloomWaterGrams: 'bloom_water_g',
  pourCount: 'pour_count',
  brewPressureBar: 'brew_pressure_bar',
  flowRateMlPerSecond: 'flow_rate_ml_per_second',
  usesPuckScreen: 'uses_puck_screen',
  paperFilterPosition: 'paper_filter_position',
  distributionMethod: 'distribution_method',
  tampForceKg: 'tamp_force_kg',
} as const satisfies Partial<Record<ShotParameterKey, BrewParameter>>

const OPEN_COFFEE_RATIOS = {
  brew_water: 'brew_ratio',
  target_yield: 'yield_ratio',
} as const satisfies Record<RatioBasis, BrewParameter>

type MappedParameter = keyof typeof OPEN_COFFEE_PARAMETERS

const SHOT_PARAMETERS = new Map<BrewParameter, MappedParameter>(
  Object.entries(OPEN_COFFEE_PARAMETERS).map(([key, parameter]) => [
    parameter,
    key as MappedParameter,
  ]),
)

export function toOpenCoffeeParameter(
  key: ShotParameterKey,
): BrewParameter | null {
  return key in OPEN_COFFEE_PARAMETERS
    ? OPEN_COFFEE_PARAMETERS[key as MappedParameter]
    : null
}

/** `brew_ratio` and `yield_ratio` map to the app's ratio basis. */
export function fromOpenCoffeeParameter(
  parameter: BrewParameter,
): ShotParameterKey | null {
  if (parameter === 'brew_ratio' || parameter === 'yield_ratio') {
    return 'ratioBasis'
  }
  return SHOT_PARAMETERS.get(parameter) ?? null
}

export function toOpenCoffeeRatioParameter(basis: RatioBasis) {
  return OPEN_COFFEE_RATIOS[basis]
}

export function fromOpenCoffeeRatioParameter(
  parameter: BrewParameter,
): RatioBasis | null {
  if (parameter === 'brew_ratio') return 'brew_water'
  if (parameter === 'yield_ratio') return 'target_yield'
  return null
}

/** Ad hoc `other` gear exports as an accessory. */
export function toOpenCoffeeEquipmentType(type: GearType): EquipmentType {
  return type === 'other' ? 'accessory' : type
}
