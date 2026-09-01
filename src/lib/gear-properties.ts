import {
  AUTO_STOP_MODE_VALUES,
  BASKET_KIND_VALUES,
  BREWER_FLOW_CONTROL_VALUES,
  BREWER_MECHANISM_VALUES,
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

export type SelectOption<TValue extends string = string> = {
  readonly value: TValue
  readonly label: string
}

function optionsFromLabels<const TValue extends string>(
  values: readonly TValue[],
  labels: Readonly<Record<TValue, string>>,
): readonly SelectOption<TValue>[] {
  return values.map((value) => ({ value, label: labels[value] }))
}

export const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
] as const

export const MACHINE_HEATING_ARCHITECTURE_OPTIONS = optionsFromLabels(
  MACHINE_HEATING_ARCHITECTURE_VALUES,
  {
    single_boiler: 'Single boiler',
    heat_exchanger: 'Heat exchanger',
    dual_boiler: 'Dual boiler',
    multi_boiler: 'Multi-boiler',
    single_thermoblock: 'Single thermoblock / thermocoil',
    dual_thermoblock: 'Dual thermoblock / thermocoil',
    hybrid: 'Hybrid',
    manual: 'Manual / externally heated',
    other: 'Other',
  },
)

export const MACHINE_TEMPERATURE_CONTROL_OPTIONS = optionsFromLabels(
  MACHINE_TEMPERATURE_CONTROL_VALUES,
  {
    none: 'None',
    fixed: 'Fixed',
    adjustable: 'Adjustable',
    programmable: 'Programmable',
  },
)

export const MACHINE_PRESSURE_CONTROL_OPTIONS = optionsFromLabels(
  MACHINE_PRESSURE_CONTROL_VALUES,
  {
    fixed: 'Fixed',
    adjustable_opv: 'Adjustable OPV',
    manual: 'Manual',
    programmable: 'Programmable',
  },
)

export const MACHINE_FLOW_CONTROL_OPTIONS = optionsFromLabels(
  MACHINE_FLOW_CONTROL_VALUES,
  {
    none: 'None',
    manual: 'Manual',
    programmable: 'Programmable',
  },
)

export const MACHINE_PREINFUSION_CONTROL_OPTIONS = optionsFromLabels(
  MACHINE_PREINFUSION_CONTROL_VALUES,
  {
    none: 'None',
    supported: 'Supported (control unknown)',
    fixed: 'Fixed',
    adjustable: 'Adjustable',
    programmable: 'Programmable',
  },
)

export const MACHINE_STEAM_SYSTEM_OPTIONS = optionsFromLabels(
  MACHINE_STEAM_SYSTEM_VALUES,
  {
    none: 'None',
    shared_heater: 'Shared heater',
    dedicated_heater: 'Dedicated heater',
  },
)

export const MACHINE_PUMP_TYPE_OPTIONS = optionsFromLabels(
  MACHINE_PUMP_TYPE_VALUES,
  {
    vibration: 'Vibration',
    rotary: 'Rotary',
    gear: 'Gear',
    peristaltic: 'Peristaltic',
    manual: 'Manual',
    other: 'Other',
  },
)

export const MACHINE_WATER_SOURCE_OPTIONS = optionsFromLabels(
  MACHINE_WATER_SOURCE_VALUES,
  { reservoir: 'Reservoir', plumbed: 'Plumbed in' },
)

export const SHOT_STOP_MODE_OPTIONS = optionsFromLabels(AUTO_STOP_MODE_VALUES, {
  manual: 'Manual',
  weight: 'Weight',
  time: 'Time',
  volume: 'Volume',
})

export const GRINDER_BURR_MECHANISM_OPTIONS = optionsFromLabels(
  GRINDER_BURR_MECHANISM_VALUES,
  {
    conical: 'Conical burr',
    flat: 'Flat burr',
    ghost: 'Ghost burr',
    roller: 'Roller',
    blade: 'Blade',
    other: 'Other',
  },
)

export const GRINDER_ADJUSTMENT_TYPE_OPTIONS = optionsFromLabels(
  GRINDER_ADJUSTMENT_TYPE_VALUES,
  { fixed: 'Fixed', stepped: 'Stepped', stepless: 'Stepless' },
)

export const GRINDER_BREW_RANGE_OPTIONS = optionsFromLabels(
  GRINDER_BREW_RANGE_VALUES,
  { espresso: 'Espresso', filter: 'Filter' },
)

export const GRINDER_BEAN_FEED_OPTIONS = optionsFromLabels(
  GRINDER_BEAN_FEED_VALUES,
  {
    single_dose: 'Single dose',
    hopper: 'Hopper',
    both: 'Single dose and hopper',
  },
)

export const GRINDER_DOSE_CONTROL_MODE_OPTIONS = optionsFromLabels(
  GRINDER_DOSE_CONTROL_MODE_VALUES,
  { manual: 'Manual', time: 'Time', weight: 'Weight' },
)

export const GRINDER_BURR_MATERIAL_OPTIONS = optionsFromLabels(
  GRINDER_BURR_MATERIAL_VALUES,
  { steel: 'Steel', ceramic: 'Ceramic', other: 'Other' },
)

export const BREWER_MECHANISM_OPTIONS = optionsFromLabels(
  BREWER_MECHANISM_VALUES,
  {
    percolation: 'Percolation',
    immersion: 'Immersion',
    hybrid: 'Hybrid',
    press: 'Press',
    vacuum: 'Vacuum',
    other: 'Other',
  },
)

export const BREWER_FLOW_CONTROL_OPTIONS = optionsFromLabels(
  BREWER_FLOW_CONTROL_VALUES,
  {
    fixed: 'Fixed',
    manual_valve: 'Manual valve',
    programmable: 'Programmable',
  },
)

export const KETTLE_SPOUT_TYPE_OPTIONS = optionsFromLabels(
  KETTLE_SPOUT_TYPE_VALUES,
  { gooseneck: 'Gooseneck', standard: 'Standard', other: 'Other' },
)

export const KETTLE_TEMPERATURE_CONTROL_OPTIONS = optionsFromLabels(
  KETTLE_TEMPERATURE_CONTROL_VALUES,
  { none: 'None', fixed: 'Fixed', adjustable: 'Adjustable' },
)

export const TAMPER_FORCE_CONTROL_OPTIONS = optionsFromLabels(
  TAMPER_FORCE_CONTROL_VALUES,
  { none: 'None', fixed: 'Fixed', adjustable: 'Adjustable' },
)

export const TAMPER_BASE_SHAPE_OPTIONS = optionsFromLabels(
  TAMPER_BASE_SHAPE_VALUES,
  { flat: 'Flat', convex: 'Convex', rippled: 'Rippled', other: 'Other' },
)

export const WDT_DEPTH_CONTROL_OPTIONS = optionsFromLabels(
  WDT_DEPTH_CONTROL_VALUES,
  { none: 'None', fixed: 'Fixed', adjustable: 'Adjustable' },
)

export const BASKET_KIND_OPTIONS = optionsFromLabels(BASKET_KIND_VALUES, {
  single: 'Single',
  double: 'Double',
  triple: 'Triple',
  other: 'Other',
})

export function optionLabel(
  options: readonly SelectOption[],
  value: string | null | undefined,
) {
  if (!value) return null
  return options.find((option) => option.value === value)?.label ?? value
}

export function currentMachineSettingRevision<
  TRevision extends {
    readonly kind: string
    readonly supersededAt: Date | string | null
  },
>(
  revisions: readonly TRevision[] | null | undefined,
  kind: 'factory' | 'owner',
) {
  return (
    revisions?.find(
      (revision) => revision.kind === kind && revision.supersededAt === null,
    ) ?? null
  )
}
