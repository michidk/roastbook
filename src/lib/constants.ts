export const ROAST_LEVELS = [
  { value: 'light', label: 'Light' },
  { value: 'medium_light', label: 'Medium Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium_dark', label: 'Medium Dark' },
  { value: 'dark', label: 'Dark' },
] as const

export type RoastLevel = (typeof ROAST_LEVELS)[number]['value']

export const BEAN_TYPES = [
  { value: 'espresso', label: 'Espresso' },
  { value: 'filter', label: 'Filter' },
  { value: 'decaf', label: 'Decaf' },
] as const

export type BeanType = (typeof BEAN_TYPES)[number]['value']

export const BEAN_TYPE_LABELS: Record<BeanType, string> = Object.fromEntries(
  BEAN_TYPES.map((type) => [type.value, type.label]),
) as Record<BeanType, string>

export const PROCESS_METHODS = [
  { value: 'washed', label: 'Washed' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'anaerobic', label: 'Anaerobic' },
  { value: 'wet_hulled', label: 'Wet Hulled' },
  { value: 'carbonic_maceration', label: 'Carbonic Maceration' },
  { value: 'other', label: 'Other' },
] as const

export const GEAR_TYPES = [
  { value: 'espresso_machine', label: 'Espresso Machine' },
  {
    value: 'espresso_machine_with_grinder',
    label: 'Espresso Machine with Built-in Grinder',
  },
  { value: 'brewer', label: 'Brewer' },
  { value: 'grinder', label: 'Grinder' },
  { value: 'kettle', label: 'Kettle' },
  { value: 'scale', label: 'Scale' },
  { value: 'tamper', label: 'Tamper' },
  { value: 'wdt', label: 'WDT Tool' },
  { value: 'basket', label: 'Basket' },
  { value: 'other', label: 'Other' },
] as const

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

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CHF', label: 'CHF' },
] as const

const DRINK_TYPES = [
  'Espresso',
  'Doppio',
  'Ristretto',
  'Lungo',
  'Americano',
  'Latte',
  'Cappuccino',
  'Flat White',
  'Cortado',
  'Macchiato',
  'Mocha',
  'Pour Over',
  'Filter',
  'Cold Brew',
  'Iced Coffee',
  'Other',
] as const

export const DRINK_TYPE_OPTIONS = DRINK_TYPES.map((type) => ({
  value: type,
  label: type,
}))
