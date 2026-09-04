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

export const MACHINE_HEATING_ARCHITECTURE_VALUES = [
  'single_boiler',
  'heat_exchanger',
  'dual_boiler',
  'multi_boiler',
  'single_thermoblock',
  'dual_thermoblock',
  'hybrid',
  'manual',
  'other',
] as const

export const MACHINE_TEMPERATURE_CONTROL_VALUES = [
  'none',
  'fixed',
  'adjustable',
  'programmable',
] as const

export const MACHINE_PRESSURE_CONTROL_VALUES = [
  'fixed',
  'adjustable_opv',
  'manual',
  'programmable',
] as const

export const MACHINE_FLOW_CONTROL_VALUES = [
  'none',
  'manual',
  'programmable',
] as const

export const MACHINE_PREINFUSION_CONTROL_VALUES = [
  'none',
  'supported',
  'fixed',
  'adjustable',
  'programmable',
] as const

export const MACHINE_STEAM_SYSTEM_VALUES = [
  'none',
  'shared_heater',
  'dedicated_heater',
] as const

export const MACHINE_PUMP_TYPE_VALUES = [
  'vibration',
  'rotary',
  'gear',
  'peristaltic',
  'manual',
  'other',
] as const

export const MACHINE_WATER_SOURCE_VALUES = ['reservoir', 'plumbed'] as const

export const GRINDER_BURR_MECHANISM_VALUES = [
  'conical',
  'flat',
  'ghost',
  'roller',
  'blade',
  'other',
] as const

export const GRINDER_ADJUSTMENT_TYPE_VALUES = [
  'fixed',
  'stepped',
  'stepless',
] as const

export const GRINDER_GRIND_SETTING_FORMAT_VALUES = [
  'whole_number',
  'decimal',
  'string',
] as const

export const GRINDER_BREW_RANGE_VALUES = ['espresso', 'filter'] as const

export const GRINDER_BEAN_FEED_VALUES = [
  'single_dose',
  'hopper',
  'both',
] as const

export const GRINDER_DOSE_CONTROL_MODE_VALUES = [
  'manual',
  'time',
  'weight',
] as const

export const GRINDER_BURR_MATERIAL_VALUES = [
  'steel',
  'ceramic',
  'other',
] as const

export const BREWER_MECHANISM_VALUES = [
  'percolation',
  'immersion',
  'hybrid',
  'press',
  'vacuum',
  'other',
] as const

export const BREWER_FLOW_CONTROL_VALUES = [
  'fixed',
  'manual_valve',
  'programmable',
] as const

export const KETTLE_SPOUT_TYPE_VALUES = [
  'gooseneck',
  'standard',
  'other',
] as const

export const KETTLE_TEMPERATURE_CONTROL_VALUES = [
  'none',
  'fixed',
  'adjustable',
] as const

export const TAMPER_FORCE_CONTROL_VALUES = [
  'none',
  'fixed',
  'adjustable',
] as const

export const TAMPER_BASE_SHAPE_VALUES = [
  'flat',
  'convex',
  'rippled',
  'other',
] as const

export const WDT_DEPTH_CONTROL_VALUES = ['none', 'fixed', 'adjustable'] as const

export const BASKET_KIND_VALUES = [
  'single',
  'double',
  'triple',
  'other',
] as const

export const GEAR_PROPERTY_SOURCE_KIND_VALUES = [
  'manual',
  'manufacturer',
  'specialist',
  'retailer',
  'community',
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
