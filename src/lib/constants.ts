import {
  BEAN_TYPE_VALUES,
  CURRENCY_VALUES,
  GEAR_TYPE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'

export const ROAST_LEVEL_LABELS = {
  light: 'Light',
  medium_light: 'Medium Light',
  medium: 'Medium',
  medium_dark: 'Medium Dark',
  dark: 'Dark',
} as const

export const ROAST_LEVELS = ROAST_LEVEL_VALUES.map((value) => ({
  value,
  label: ROAST_LEVEL_LABELS[value],
}))

export type RoastLevel = (typeof ROAST_LEVELS)[number]['value']

const BEAN_TYPE_LABELS_BY_VALUE = {
  espresso: 'Espresso',
  filter: 'Filter',
  decaf: 'Decaf',
} as const

export const BEAN_TYPES = BEAN_TYPE_VALUES.map((value) => ({
  value,
  label: BEAN_TYPE_LABELS_BY_VALUE[value],
}))

export type BeanType = (typeof BEAN_TYPES)[number]['value']

export const BEAN_TYPE_LABELS: Record<BeanType, string> = Object.fromEntries(
  BEAN_TYPES.map((type) => [type.value, type.label]),
) as Record<BeanType, string>

export const PROCESS_METHOD_LABELS = {
  washed: 'Washed',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaerobic',
  wet_hulled: 'Wet Hulled',
  carbonic_maceration: 'Carbonic Maceration',
  other: 'Other',
} as const

export const PROCESS_METHODS = PROCESS_METHOD_VALUES.map((value) => ({
  value,
  label: PROCESS_METHOD_LABELS[value],
}))

export function getRoastLevelLabel(value: string): string {
  return (
    (ROAST_LEVEL_LABELS as Readonly<Record<string, string>>)[value] ?? value
  )
}

export function getProcessMethodLabel(value: string): string {
  return (
    (PROCESS_METHOD_LABELS as Readonly<Record<string, string>>)[value] ?? value
  )
}

const GEAR_TYPE_LABELS_BY_VALUE = {
  espresso_machine: 'Espresso Machine',
  espresso_machine_with_grinder: 'Espresso Machine w/ Grinder',
  brewer: 'Brewer',
  grinder: 'Grinder',
  kettle: 'Kettle',
  scale: 'Scale',
  tamper: 'Tamper',
  wdt: 'WDT Tool',
  basket: 'Basket',
  other: 'Other',
} as const

export const GEAR_TYPES = GEAR_TYPE_VALUES.map((value) => ({
  value,
  label: GEAR_TYPE_LABELS_BY_VALUE[value],
}))

export type GearType = (typeof GEAR_TYPES)[number]['value']

export function isEspressoMachineGearType(type: string) {
  return type === 'espresso_machine' || type === 'espresso_machine_with_grinder'
}

export function isGrinderGearType(type: string) {
  return type === 'grinder' || type === 'espresso_machine_with_grinder'
}

export const GEAR_TYPE_LABELS: Record<GearType, string> = Object.fromEntries(
  GEAR_TYPES.map((t) => [t.value, t.label]),
) as Record<GearType, string>

export const CURRENCIES = CURRENCY_VALUES.map((value) => ({
  value,
  label: value,
}))
