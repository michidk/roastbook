import type { EquipmentType } from '@roastbook/open-coffee-schema'

// Equipment and brew-parameter taxonomies come from the Open Coffee standard.
export {
  DISTRIBUTION_METHOD_VALUES,
  EQUIPMENT_BASKET_KIND_VALUES as BASKET_KIND_VALUES,
  EQUIPMENT_BREWER_FLOW_CONTROL_VALUES as BREWER_FLOW_CONTROL_VALUES,
  EQUIPMENT_BREWER_MECHANISM_VALUES as BREWER_MECHANISM_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_FLOW_CONTROL_VALUES as MACHINE_FLOW_CONTROL_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_HEATING_ARCHITECTURE_VALUES as MACHINE_HEATING_ARCHITECTURE_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_PREINFUSION_CONTROL_VALUES as MACHINE_PREINFUSION_CONTROL_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_PRESSURE_CONTROL_VALUES as MACHINE_PRESSURE_CONTROL_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_PUMP_TYPE_VALUES as MACHINE_PUMP_TYPE_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_SHOT_STOP_MODES_VALUES as AUTO_STOP_MODE_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_STEAM_SYSTEM_VALUES as MACHINE_STEAM_SYSTEM_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_TEMPERATURE_CONTROL_VALUES as MACHINE_TEMPERATURE_CONTROL_VALUES,
  EQUIPMENT_ESPRESSO_MACHINE_WATER_SOURCE_MODES_VALUES as MACHINE_WATER_SOURCE_VALUES,
  EQUIPMENT_GRINDER_ADJUSTMENT_TYPE_VALUES as GRINDER_ADJUSTMENT_TYPE_VALUES,
  EQUIPMENT_GRINDER_BEAN_FEED_VALUES as GRINDER_BEAN_FEED_VALUES,
  EQUIPMENT_GRINDER_BREW_RANGE_VALUES as GRINDER_BREW_RANGE_VALUES,
  EQUIPMENT_GRINDER_BURR_MATERIAL_VALUES as GRINDER_BURR_MATERIAL_VALUES,
  EQUIPMENT_GRINDER_BURR_MECHANISM_VALUES as GRINDER_BURR_MECHANISM_VALUES,
  EQUIPMENT_GRINDER_DOSE_CONTROL_MODES_VALUES as GRINDER_DOSE_CONTROL_MODE_VALUES,
  EQUIPMENT_GRINDER_GRIND_SETTING_FORMAT_VALUES as GRINDER_GRIND_SETTING_FORMAT_VALUES,
  EQUIPMENT_KETTLE_SPOUT_TYPE_VALUES as KETTLE_SPOUT_TYPE_VALUES,
  EQUIPMENT_KETTLE_TEMPERATURE_CONTROL_VALUES as KETTLE_TEMPERATURE_CONTROL_VALUES,
  EQUIPMENT_TAMPER_BASE_SHAPE_VALUES as TAMPER_BASE_SHAPE_VALUES,
  EQUIPMENT_TAMPER_FORCE_CONTROL_VALUES as TAMPER_FORCE_CONTROL_VALUES,
  EQUIPMENT_WDT_DEPTH_CONTROL_VALUES as WDT_DEPTH_CONTROL_VALUES,
  PAPER_FILTER_POSITION_VALUES,
} from '@roastbook/open-coffee-schema'

export const BEAN_TYPE_VALUES = ['espresso', 'filter', 'omni'] as const

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

// The Open Coffee equipment types plus `other`, the app's ad hoc gear (exported
// as `accessory`). Kept in the order of the PostgreSQL enum, which cannot reorder.
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
  'filter',
  'roaster',
  'milk_frother',
  'accessory',
  'other',
] as const satisfies readonly (EquipmentType | 'other')[]

export const CURRENCY_VALUES = ['EUR', 'USD', 'GBP', 'CHF'] as const

export const GEAR_PROPERTY_SOURCE_KIND_VALUES = [
  'manual',
  'manufacturer',
  'specialist',
  'retailer',
  'community',
] as const

export const RATIO_BASIS_VALUES = ['target_yield', 'brew_water'] as const

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
  'bean-purchases',
  'gear',
  'coffee-shops',
  'shots',
  'visits',
] as const

export const THUMBNAIL_ENTITY_TYPE_VALUES = ['bean-purchases', 'gear'] as const

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
