export const BEAN_TYPE_VALUES = ['espresso', 'filter', 'decaf'] as const

export const ROAST_LEVEL_VALUES = [
  'light',
  'medium_light',
  'medium',
  'medium_dark',
  'dark',
] as const

export const PROCESS_METHOD_VALUES = [
  'washed',
  'natural',
  'honey',
  'anaerobic',
  'wet_hulled',
  'carbonic_maceration',
  'other',
] as const

export const GEAR_TYPE_VALUES = [
  'espresso_machine',
  'espresso_machine_with_grinder',
  'brewer',
  'grinder',
  'kettle',
  'scale',
  'tamper',
  'wdt',
  'basket',
  'other',
] as const

export const CURRENCY_VALUES = ['EUR', 'USD', 'GBP', 'CHF'] as const

export const AUTO_STOP_MODE_VALUES = [
  'manual',
  'weight',
  'time',
  'volume',
] as const

export const RATIO_BASIS_VALUES = ['target_yield', 'brew_water'] as const

export const PAPER_FILTER_POSITION_VALUES = [
  'none',
  'top',
  'bottom',
  'both',
] as const

export const DISTRIBUTION_METHOD_VALUES = [
  'WDT',
  'Blind shaker',
  'Distribution tool',
  'Stockfleth move',
] as const

export const IMAGE_MIME_TYPE_VALUES = [
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const ENTITY_TYPE_VALUES = [
  'beans',
  'gear',
  'coffee-shops',
  'shots',
  'visits',
] as const

export const THUMBNAIL_ENTITY_TYPE_VALUES = ['beans', 'gear'] as const

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
