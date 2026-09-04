import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  decimal,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import {
  BEAN_TYPE_VALUES,
  GEAR_TYPE_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'
import type { JsonValue } from '@/lib/json-value'

const timestamps = () => ({
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

const archiveState = () => ({
  isArchived: boolean('is_archived').default(false).notNull(),
  ...timestamps(),
})

const imageFile = () => ({
  storagePath: text('storage_path').notNull(),
  originalFilename: text('original_filename'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
})

const createdAt = () => timestamp('created_at').defaultNow().notNull()

export const gearTypeEnum = pgEnum('gear_type', GEAR_TYPE_VALUES)

export const roastLevelEnum = pgEnum('roast_level', ROAST_LEVEL_VALUES)

export const beanTypeEnum = pgEnum('bean_type', BEAN_TYPE_VALUES)

export const settings = pgTable(
  'settings',
  {
    id: integer('id').primaryKey().default(1),
    defaultCurrency: text('default_currency').default('EUR').notNull(),
    dateFormat: text('date_format').default('day-month-year-slash').notNull(),
    numberFormat: text('number_format').default('decimal-point').notNull(),
    timeZone: text('time_zone').default('UTC').notNull(),
    defaultListView: text('default_list_view').default('cards').notNull(),
    backgroundTextureEnabled: boolean('background_texture_enabled')
      .default(true)
      .notNull(),
    tasteProfileFields: text('taste_profile_fields')
      .array()
      .default(
        sql`'{overallRating,bitterness,acidity,sweetness,body,astringency,flavorTags,notes}'::text[]`,
      )
      .notNull(),
    defaultMapLatitude: doublePrecision('default_map_latitude').default(
      48.8566,
    ),
    defaultMapLongitude: doublePrecision('default_map_longitude').default(
      2.3522,
    ),
    defaultMapLabel: text('default_map_label').default('Paris, France'),
    ...timestamps(),
  },
  (table) => [
    check('settings_singleton_check', sql`${table.id} = 1`),
    check(
      'settings_currency_check',
      sql`${table.defaultCurrency} in ('EUR', 'USD', 'GBP', 'CHF')`,
    ),
    check(
      'settings_date_format_check',
      sql`${table.dateFormat} in ('day-month-year-slash', 'month-day-year-slash', 'day-month-year-dot', 'year-month-day')`,
    ),
    check(
      'settings_number_format_check',
      sql`${table.numberFormat} in ('decimal-point', 'decimal-comma', 'space-decimal-point', 'space-decimal-comma', 'apostrophe-decimal-point', 'apostrophe-decimal-comma')`,
    ),
    check(
      'settings_list_view_check',
      sql`${table.defaultListView} in ('cards', 'table')`,
    ),
    check(
      'settings_map_location_check',
      sql`(
        (${table.defaultMapLatitude} is null
          and ${table.defaultMapLongitude} is null
          and ${table.defaultMapLabel} is null)
        or
        (${table.defaultMapLatitude} is not null
          and ${table.defaultMapLongitude} is not null
          and ${table.defaultMapLabel} is not null
          and ${table.defaultMapLatitude} between -90 and 90
          and ${table.defaultMapLongitude} between -180 and 180
          and length(trim(${table.defaultMapLabel})) > 0)
      )`,
    ),
  ],
)

export const drinkTypes = pgTable('drink_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  isArchived: boolean('is_archived').default(false).notNull(),
  ...timestamps(),
})

export const drinkOptionGroups = pgTable('drink_option_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  isArchived: boolean('is_archived').default(false).notNull(),
  ...timestamps(),
})

export const drinkOptionValues = pgTable(
  'drink_option_values',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .references(() => drinkOptionGroups.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('drink_option_values_group_name_idx').on(
      table.groupId,
      table.name,
    ),
    index('drink_option_values_group_id_idx').on(table.groupId),
  ],
)

export const drinkTypeOptionGroups = pgTable(
  'drink_type_option_groups',
  {
    id: serial('id').primaryKey(),
    drinkTypeId: integer('drink_type_id')
      .references(() => drinkTypes.id, { onDelete: 'cascade' })
      .notNull(),
    optionGroupId: integer('option_group_id')
      .references(() => drinkOptionGroups.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('drink_type_option_groups_type_group_idx').on(
      table.drinkTypeId,
      table.optionGroupId,
    ),
    index('drink_type_option_groups_group_id_idx').on(table.optionGroupId),
  ],
)

export const drinkOptionGroupsRelations = relations(
  drinkOptionGroups,
  ({ many }) => ({
    values: many(drinkOptionValues),
    drinkTypeLinks: many(drinkTypeOptionGroups),
  }),
)

export const drinkTypeOptionGroupsRelations = relations(
  drinkTypeOptionGroups,
  ({ one }) => ({
    drinkType: one(drinkTypes, {
      fields: [drinkTypeOptionGroups.drinkTypeId],
      references: [drinkTypes.id],
    }),
    optionGroup: one(drinkOptionGroups, {
      fields: [drinkTypeOptionGroups.optionGroupId],
      references: [drinkOptionGroups.id],
    }),
  }),
)

export const aiUsage = pgTable(
  'ai_usage',
  {
    id: serial('id').primaryKey(),
    requestId: text('request_id').notNull(),
    feature: text('feature').notNull(),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens').notNull(),
    cachedPromptTokens: integer('cached_prompt_tokens').default(0).notNull(),
    completionTokens: integer('completion_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    estimatedCostUsd: decimal('estimated_cost_usd', {
      precision: 18,
      scale: 10,
    }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'ai_usage_tokens_nonnegative_check',
      sql`${table.promptTokens} >= 0
        and ${table.cachedPromptTokens} >= 0
        and ${table.cachedPromptTokens} <= ${table.promptTokens}
        and ${table.completionTokens} >= 0
        and ${table.totalTokens} >= 0`,
    ),
    check(
      'ai_usage_cost_nonnegative_check',
      sql`${table.estimatedCostUsd} is null or ${table.estimatedCostUsd} >= 0`,
    ),
    index('ai_usage_request_id_idx').on(table.requestId),
    index('ai_usage_created_at_idx').on(table.createdAt),
  ],
)

export const aiRequestLogs = pgTable(
  'ai_request_logs',
  {
    id: serial('id').primaryKey(),
    requestType: text('request_type').notNull(),
    model: text('model').notNull(),
    status: text('status').default('in_progress').notNull(),
    requestPayload: jsonb('request_payload').$type<JsonValue>().notNull(),
    responsePayload: jsonb('response_payload').$type<JsonValue>(),
    errorMessage: text('error_message'),
    promptTokens: integer('prompt_tokens').default(0).notNull(),
    cachedPromptTokens: integer('cached_prompt_tokens').default(0).notNull(),
    completionTokens: integer('completion_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    estimatedCostUsd: decimal('estimated_cost_usd', {
      precision: 18,
      scale: 10,
    }),
    durationMs: integer('duration_ms'),
    completedAt: timestamp('completed_at'),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'ai_request_logs_status_check',
      sql`${table.status} in ('in_progress', 'succeeded', 'failed', 'aborted')`,
    ),
    check(
      'ai_request_logs_usage_check',
      sql`${table.promptTokens} >= 0
        and ${table.cachedPromptTokens} >= 0
        and ${table.cachedPromptTokens} <= ${table.promptTokens}
        and ${table.completionTokens} >= 0
        and ${table.totalTokens} >= 0
        and (${table.estimatedCostUsd} is null or ${table.estimatedCostUsd} >= 0)`,
    ),
    index('ai_request_logs_created_at_idx').on(table.createdAt),
  ],
)

export const roasters = pgTable(
  'roasters',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    location: text('location'),
    country: text('country'),
    website: text('website'),
    instagramHandle: text('instagram_handle'),
    notes: text('notes'),
    ...timestamps(),
  },
  (table) => [index('roasters_name_idx').on(table.name)],
)

export const roastersRelations = relations(roasters, ({ many }) => ({
  beans: many(beans),
}))

export const beans = pgTable(
  'beans',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: beanTypeEnum('type'),
    roaster: text('roaster'), // Legacy text field
    roasterId: integer('roaster_id').references(() => roasters.id, {
      onDelete: 'set null',
    }),
    origin: text('origin'),
    region: text('region'),
    farm: text('farm'),
    variety: text('variety'),
    process: text('process'),
    roastLevel: roastLevelEnum('roast_level'),
    roastDate: timestamp('roast_date'),
    weight: decimal('weight', { precision: 6, scale: 2 }),
    price: decimal('price', { precision: 8, scale: 2 }),
    priceCurrency: text('price_currency').default('EUR'),
    shopUrl: text('shop_url'),
    notes: text('notes'),
    ...archiveState(),
  },
  (table) => [
    check('beans_weight_nonnegative', sql`${table.weight} >= 0`),
    check('beans_price_nonnegative', sql`${table.price} >= 0`),
    check(
      'beans_currency_check',
      sql`${table.priceCurrency} in ('EUR', 'USD', 'GBP', 'CHF')`,
    ),
    index('beans_created_at_idx').on(table.createdAt),
    index('beans_roaster_id_idx').on(table.roasterId),
  ],
)

export const beansRelations = relations(beans, ({ one, many }) => ({
  roasterRef: one(roasters, {
    fields: [beans.roasterId],
    references: [roasters.id],
  }),
  images: many(beanImages),
  shots: many(shots),
}))

export const beanImages = pgTable(
  'bean_images',
  {
    id: serial('id').primaryKey(),
    beanId: integer('bean_id')
      .references(() => beans.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    isThumbnail: boolean('is_thumbnail').default(false).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('bean_images_bean_id_idx').on(table.beanId),
    uniqueIndex('bean_images_one_thumbnail_idx')
      .on(table.beanId)
      .where(sql`${table.isThumbnail} = true`),
  ],
)

export const beanImagesRelations = relations(beanImages, ({ one }) => ({
  bean: one(beans, {
    fields: [beanImages.beanId],
    references: [beans.id],
  }),
}))

export const gear = pgTable(
  'gear',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand'),
    model: text('model'),
    type: gearTypeEnum('type').notNull(),
    purchaseDate: timestamp('purchase_date'),
    purchasePrice: decimal('purchase_price', { precision: 8, scale: 2 }),
    priceCurrency: text('price_currency').default('EUR'),
    manualUrl: text('manual_url'),
    productUrl: text('product_url'),
    notes: text('notes'),
    ...archiveState(),
  },
  (table) => [
    check('gear_purchase_price_nonnegative', sql`${table.purchasePrice} >= 0`),
    check(
      'gear_currency_check',
      sql`${table.priceCurrency} in ('EUR', 'USD', 'GBP', 'CHF')`,
    ),
    index('gear_created_at_idx').on(table.createdAt),
  ],
)

export const espressoMachineDetails = pgTable(
  'espresso_machine_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    portafilterDiameterMm: decimal('portafilter_diameter_mm', {
      precision: 5,
      scale: 2,
    }),
    heatingArchitecture: text('heating_architecture'),
    temperatureControl: text('temperature_control'),
    pressureControl: text('pressure_control'),
    flowControl: text('flow_control'),
    preinfusionControl: text('preinfusion_control'),
    shotStopModes: text('shot_stop_modes').array(),
    steamSystem: text('steam_system'),
    simultaneousBrewAndSteam: boolean('simultaneous_brew_and_steam'),
    groupCount: integer('group_count'),
    pumpType: text('pump_type'),
    waterSourceModes: text('water_source_modes').array(),
    brewPressureMinimumBar: decimal('brew_pressure_minimum_bar', {
      precision: 4,
      scale: 2,
    }),
    brewPressureMaximumBar: decimal('brew_pressure_maximum_bar', {
      precision: 4,
      scale: 2,
    }),
    brewTemperatureMinimumCelsius: decimal('brew_temperature_minimum_celsius', {
      precision: 4,
      scale: 1,
    }),
    brewTemperatureMaximumCelsius: decimal('brew_temperature_maximum_celsius', {
      precision: 4,
      scale: 1,
    }),
  },
  (table) => [
    check(
      'espresso_machine_details_heating_architecture_check',
      sql`${table.heatingArchitecture} in ('single_boiler', 'heat_exchanger', 'dual_boiler', 'multi_boiler', 'single_thermoblock', 'dual_thermoblock', 'hybrid', 'manual', 'other')`,
    ),
    check(
      'espresso_machine_details_temperature_control_check',
      sql`${table.temperatureControl} in ('none', 'fixed', 'adjustable', 'programmable')`,
    ),
    check(
      'espresso_machine_details_pressure_control_check',
      sql`${table.pressureControl} in ('fixed', 'adjustable_opv', 'manual', 'programmable')`,
    ),
    check(
      'espresso_machine_details_flow_control_check',
      sql`${table.flowControl} in ('none', 'manual', 'programmable')`,
    ),
    check(
      'espresso_machine_details_preinfusion_control_check',
      sql`${table.preinfusionControl} in ('none', 'supported', 'fixed', 'adjustable', 'programmable')`,
    ),
    check(
      'espresso_machine_details_shot_stop_modes_check',
      sql`${table.shotStopModes} <@ ARRAY['manual', 'weight', 'time', 'volume']::text[]`,
    ),
    check(
      'espresso_machine_details_steam_system_check',
      sql`${table.steamSystem} in ('none', 'shared_heater', 'dedicated_heater')`,
    ),
    check(
      'espresso_machine_details_pump_type_check',
      sql`${table.pumpType} in ('vibration', 'rotary', 'gear', 'peristaltic', 'manual', 'other')`,
    ),
    check(
      'espresso_machine_details_water_source_modes_check',
      sql`${table.waterSourceModes} <@ ARRAY['reservoir', 'plumbed']::text[]`,
    ),
    check(
      'espresso_machine_details_measurements_check',
      sql`(${table.portafilterDiameterMm} is null or ${table.portafilterDiameterMm} > 0)
        and (${table.groupCount} is null or ${table.groupCount} > 0)
        and (${table.brewPressureMinimumBar} is null or ${table.brewPressureMinimumBar} >= 0)
        and (${table.brewPressureMaximumBar} is null or ${table.brewPressureMaximumBar} >= 0)
        and (${table.brewPressureMinimumBar} is null or ${table.brewPressureMaximumBar} is null or ${table.brewPressureMinimumBar} <= ${table.brewPressureMaximumBar})
        and (${table.brewTemperatureMinimumCelsius} is null or ${table.brewTemperatureMaximumCelsius} is null or ${table.brewTemperatureMinimumCelsius} <= ${table.brewTemperatureMaximumCelsius})`,
    ),
  ],
)

export const espressoMachineSettingRevisions = pgTable(
  'espresso_machine_setting_revisions',
  {
    id: serial('id').primaryKey(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
    kind: text('kind').notNull(),
    brewPressureBar: decimal('brew_pressure_bar', {
      precision: 4,
      scale: 2,
    }),
    preinfusionEnabled: boolean('preinfusion_enabled'),
    preinfusionTimeSeconds: decimal('preinfusion_time_seconds', {
      precision: 5,
      scale: 2,
    }),
    preinfusionPressureBar: decimal('preinfusion_pressure_bar', {
      precision: 4,
      scale: 2,
    }),
    flowLimitMlPerSecond: decimal('flow_limit_ml_per_second', {
      precision: 4,
      scale: 2,
    }),
    brewTemperatureOffsetCelsius: decimal('brew_temperature_offset_celsius', {
      precision: 4,
      scale: 1,
    }),
    programmedVolumeMl: decimal('programmed_volume_ml', {
      precision: 6,
      scale: 2,
    }),
    defaultStopMode: text('default_stop_mode'),
    steamTemperatureCelsius: decimal('steam_temperature_celsius', {
      precision: 4,
      scale: 1,
    }),
    steamPressureBar: decimal('steam_pressure_bar', {
      precision: 4,
      scale: 2,
    }),
    effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
    supersededAt: timestamp('superseded_at'),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'espresso_machine_setting_revisions_kind_check',
      sql`${table.kind} in ('factory', 'owner')`,
    ),
    check(
      'espresso_machine_setting_revisions_stop_mode_check',
      sql`${table.defaultStopMode} in ('manual', 'weight', 'time', 'volume')`,
    ),
    check(
      'espresso_machine_setting_revisions_measurements_check',
      sql`(${table.brewPressureBar} is null or ${table.brewPressureBar} >= 0)
        and (${table.preinfusionTimeSeconds} is null or ${table.preinfusionTimeSeconds} >= 0)
        and (${table.preinfusionPressureBar} is null or ${table.preinfusionPressureBar} >= 0)
        and (${table.flowLimitMlPerSecond} is null or ${table.flowLimitMlPerSecond} >= 0)
        and (${table.programmedVolumeMl} is null or ${table.programmedVolumeMl} >= 0)
        and (${table.steamTemperatureCelsius} is null or ${table.steamTemperatureCelsius} >= 0)
        and (${table.steamPressureBar} is null or ${table.steamPressureBar} >= 0)`,
    ),
    uniqueIndex('espresso_machine_setting_revisions_current_kind_idx')
      .on(table.gearId, table.kind)
      .where(sql`${table.supersededAt} is null`),
    index('espresso_machine_setting_revisions_gear_id_idx').on(
      table.gearId,
      table.effectiveFrom,
    ),
  ],
)

export const grinderDetails = pgTable(
  'grinder_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    burrMechanism: text('burr_mechanism'),
    burrDiameterMm: decimal('burr_diameter_mm', { precision: 5, scale: 2 }),
    adjustmentType: text('adjustment_type'),
    grindSettingFormat: text('grind_setting_format')
      .default('string')
      .notNull(),
    grindSettingMinimum: decimal('grind_setting_minimum', {
      precision: 7,
      scale: 3,
    }),
    grindSettingMaximum: decimal('grind_setting_maximum', {
      precision: 7,
      scale: 3,
    }),
    brewRange: text('brew_range').array(),
    beanFeed: text('bean_feed'),
    doseControlModes: text('dose_control_modes').array(),
    burrMaterial: text('burr_material'),
  },
  (table) => [
    check(
      'grinder_details_burr_mechanism_check',
      sql`${table.burrMechanism} in ('conical', 'flat', 'ghost', 'roller', 'blade', 'other')`,
    ),
    check(
      'grinder_details_adjustment_type_check',
      sql`${table.adjustmentType} in ('fixed', 'stepped', 'stepless')`,
    ),
    check(
      'grinder_details_grind_setting_format_check',
      sql`${table.grindSettingFormat} in ('whole_number', 'decimal', 'string')`,
    ),
    check(
      'grinder_details_brew_range_check',
      sql`${table.brewRange} <@ ARRAY['espresso', 'filter']::text[]`,
    ),
    check(
      'grinder_details_bean_feed_check',
      sql`${table.beanFeed} in ('single_dose', 'hopper', 'both')`,
    ),
    check(
      'grinder_details_dose_control_modes_check',
      sql`${table.doseControlModes} <@ ARRAY['manual', 'time', 'weight']::text[]`,
    ),
    check(
      'grinder_details_burr_material_check',
      sql`${table.burrMaterial} in ('steel', 'ceramic', 'other')`,
    ),
    check(
      'grinder_details_burr_diameter_check',
      sql`${table.burrDiameterMm} is null or ${table.burrDiameterMm} > 0`,
    ),
    check(
      'grinder_details_grind_setting_range_check',
      sql`(${table.grindSettingMinimum} is null or ${table.grindSettingMinimum} >= 0)
        and (${table.grindSettingMaximum} is null or ${table.grindSettingMaximum} >= 0)
        and (${table.grindSettingMinimum} is null or ${table.grindSettingMaximum} is null or ${table.grindSettingMinimum} <= ${table.grindSettingMaximum})
        and (${table.grindSettingFormat} <> 'string' or (${table.grindSettingMinimum} is null and ${table.grindSettingMaximum} is null))
        and (${table.grindSettingFormat} <> 'whole_number' or ${table.grindSettingMinimum} is null or trunc(${table.grindSettingMinimum}) = ${table.grindSettingMinimum})
        and (${table.grindSettingFormat} <> 'whole_number' or ${table.grindSettingMaximum} is null or trunc(${table.grindSettingMaximum}) = ${table.grindSettingMaximum})`,
    ),
  ],
)

export const brewerDetails = pgTable(
  'brewer_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    mechanism: text('mechanism'),
    capacityMl: decimal('capacity_ml', { precision: 7, scale: 2 }),
    filterFormat: text('filter_format'),
    flowControl: text('flow_control'),
  },
  (table) => [
    check(
      'brewer_details_mechanism_check',
      sql`${table.mechanism} in ('percolation', 'immersion', 'hybrid', 'press', 'vacuum', 'other')`,
    ),
    check(
      'brewer_details_flow_control_check',
      sql`${table.flowControl} in ('fixed', 'manual_valve', 'programmable')`,
    ),
    check(
      'brewer_details_capacity_check',
      sql`${table.capacityMl} is null or ${table.capacityMl} > 0`,
    ),
  ],
)

export const kettleDetails = pgTable(
  'kettle_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    capacityMl: decimal('capacity_ml', { precision: 7, scale: 2 }),
    spoutType: text('spout_type'),
    temperatureControl: text('temperature_control'),
    minimumTemperatureCelsius: decimal('minimum_temperature_celsius', {
      precision: 4,
      scale: 1,
    }),
    maximumTemperatureCelsius: decimal('maximum_temperature_celsius', {
      precision: 4,
      scale: 1,
    }),
    supportsTemperatureHold: boolean('supports_temperature_hold'),
  },
  (table) => [
    check(
      'kettle_details_spout_type_check',
      sql`${table.spoutType} in ('gooseneck', 'standard', 'other')`,
    ),
    check(
      'kettle_details_temperature_control_check',
      sql`${table.temperatureControl} in ('none', 'fixed', 'adjustable')`,
    ),
    check(
      'kettle_details_measurements_check',
      sql`(${table.capacityMl} is null or ${table.capacityMl} > 0)
        and (${table.minimumTemperatureCelsius} is null or ${table.minimumTemperatureCelsius} >= 0)
        and (${table.maximumTemperatureCelsius} is null or ${table.maximumTemperatureCelsius} >= 0)
        and (${table.minimumTemperatureCelsius} is null or ${table.maximumTemperatureCelsius} is null or ${table.minimumTemperatureCelsius} <= ${table.maximumTemperatureCelsius})`,
    ),
  ],
)

export const scaleDetails = pgTable(
  'scale_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    resolutionGrams: decimal('resolution_grams', { precision: 7, scale: 3 }),
    capacityGrams: decimal('capacity_grams', { precision: 9, scale: 2 }),
    hasTimer: boolean('has_timer'),
    supportsAutoTare: boolean('supports_auto_tare'),
    supportsAutoTimer: boolean('supports_auto_timer'),
    hasFlowRateDisplay: boolean('has_flow_rate_display'),
  },
  (table) => [
    check(
      'scale_details_measurements_check',
      sql`(${table.resolutionGrams} is null or ${table.resolutionGrams} > 0)
        and (${table.capacityGrams} is null or ${table.capacityGrams} > 0)`,
    ),
  ],
)

export const tamperDetails = pgTable(
  'tamper_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    diameterMm: decimal('diameter_mm', { precision: 5, scale: 2 }),
    forceControl: text('force_control'),
    baseShape: text('base_shape'),
    selfLeveling: boolean('self_leveling'),
  },
  (table) => [
    check(
      'tamper_details_force_control_check',
      sql`${table.forceControl} in ('none', 'fixed', 'adjustable')`,
    ),
    check(
      'tamper_details_base_shape_check',
      sql`${table.baseShape} in ('flat', 'convex', 'rippled', 'other')`,
    ),
    check(
      'tamper_details_diameter_check',
      sql`${table.diameterMm} is null or ${table.diameterMm} > 0`,
    ),
  ],
)

export const wdtDetails = pgTable(
  'wdt_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    needleDiameterMm: decimal('needle_diameter_mm', {
      precision: 5,
      scale: 3,
    }),
    needleCount: integer('needle_count'),
    depthControl: text('depth_control'),
  },
  (table) => [
    check(
      'wdt_details_depth_control_check',
      sql`${table.depthControl} in ('none', 'fixed', 'adjustable')`,
    ),
    check(
      'wdt_details_measurements_check',
      sql`(${table.needleDiameterMm} is null or ${table.needleDiameterMm} > 0)
        and (${table.needleCount} is null or ${table.needleCount} > 0)`,
    ),
  ],
)

export const basketDetails = pgTable(
  'basket_details',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    nominalDoseGrams: decimal('nominal_dose_grams', {
      precision: 5,
      scale: 2,
    }),
    diameterMm: decimal('diameter_mm', { precision: 5, scale: 2 }),
    isPressurized: boolean('is_pressurized'),
    doseMinimumGrams: decimal('dose_minimum_grams', {
      precision: 5,
      scale: 2,
    }),
    doseMaximumGrams: decimal('dose_maximum_grams', {
      precision: 5,
      scale: 2,
    }),
    kind: text('kind'),
  },
  (table) => [
    check(
      'basket_details_kind_check',
      sql`${table.kind} in ('single', 'double', 'triple', 'other')`,
    ),
    check(
      'basket_details_measurements_check',
      sql`(${table.nominalDoseGrams} is null or ${table.nominalDoseGrams} >= 0)
        and (${table.diameterMm} is null or ${table.diameterMm} > 0)
        and (${table.doseMinimumGrams} is null or ${table.doseMinimumGrams} > 0)
        and (${table.doseMaximumGrams} is null or ${table.doseMaximumGrams} > 0)
        and (${table.doseMinimumGrams} is null or ${table.doseMaximumGrams} is null or ${table.doseMinimumGrams} <= ${table.doseMaximumGrams})`,
    ),
  ],
)

export const gearPropertyEvidence = pgTable(
  'gear_property_evidence',
  {
    id: serial('id').primaryKey(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
    propertyKey: text('property_key').notNull(),
    valueJson: jsonb('value_json').$type<JsonValue>().notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceTitle: text('source_title'),
    sourceKind: text('source_kind').notNull(),
    rawValue: text('raw_value'),
    rawUnit: text('raw_unit'),
    retrievedAt: timestamp('retrieved_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'gear_property_evidence_source_kind_check',
      sql`${table.sourceKind} in ('manual', 'manufacturer', 'specialist', 'retailer', 'community')`,
    ),
    index('gear_property_evidence_gear_property_idx').on(
      table.gearId,
      table.propertyKey,
    ),
  ],
)

export const gearRelations = relations(gear, ({ one, many }) => ({
  images: many(gearImages),
  espressoMachineDetails: one(espressoMachineDetails),
  machineSettingRevisions: many(espressoMachineSettingRevisions),
  grinderDetails: one(grinderDetails),
  brewerDetails: one(brewerDetails),
  kettleDetails: one(kettleDetails),
  scaleDetails: one(scaleDetails),
  tamperDetails: one(tamperDetails),
  wdtDetails: one(wdtDetails),
  basketDetails: one(basketDetails),
  propertyEvidence: many(gearPropertyEvidence),
  shots: many(shots, { relationName: 'shotMachine' }),
  shotAccessoryLinks: many(shotAccessoryGear),
  recipeAccessoryLinks: many(recipeAccessoryGear),
}))

export const espressoMachineDetailsRelations = relations(
  espressoMachineDetails,
  ({ one }) => ({
    gear: one(gear, {
      fields: [espressoMachineDetails.gearId],
      references: [gear.id],
    }),
  }),
)

export const espressoMachineSettingRevisionsRelations = relations(
  espressoMachineSettingRevisions,
  ({ one, many }) => ({
    gear: one(gear, {
      fields: [espressoMachineSettingRevisions.gearId],
      references: [gear.id],
    }),
    shots: many(shots),
  }),
)

export const grinderDetailsRelations = relations(grinderDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [grinderDetails.gearId],
    references: [gear.id],
  }),
}))

export const brewerDetailsRelations = relations(brewerDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [brewerDetails.gearId],
    references: [gear.id],
  }),
}))

export const kettleDetailsRelations = relations(kettleDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [kettleDetails.gearId],
    references: [gear.id],
  }),
}))

export const scaleDetailsRelations = relations(scaleDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [scaleDetails.gearId],
    references: [gear.id],
  }),
}))

export const tamperDetailsRelations = relations(tamperDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [tamperDetails.gearId],
    references: [gear.id],
  }),
}))

export const wdtDetailsRelations = relations(wdtDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [wdtDetails.gearId],
    references: [gear.id],
  }),
}))

export const basketDetailsRelations = relations(basketDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [basketDetails.gearId],
    references: [gear.id],
  }),
}))

export const gearPropertyEvidenceRelations = relations(
  gearPropertyEvidence,
  ({ one }) => ({
    gear: one(gear, {
      fields: [gearPropertyEvidence.gearId],
      references: [gear.id],
    }),
  }),
)

export const gearSets = pgTable(
  'gear_sets',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    machineId: integer('machine_id').references(() => gear.id, {
      onDelete: 'set null',
    }),
    grinderId: integer('grinder_id').references(() => gear.id, {
      onDelete: 'set null',
    }),
    basketId: integer('basket_id').references(() => gear.id, {
      onDelete: 'set null',
    }),
    ...timestamps(),
  },
  (table) => [index('gear_sets_created_at_idx').on(table.createdAt)],
)

export const gearSetAccessoryGear = pgTable(
  'gear_set_accessory_gear',
  {
    id: serial('id').primaryKey(),
    gearSetId: integer('gear_set_id')
      .references(() => gearSets.id, { onDelete: 'cascade' })
      .notNull(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('gear_set_accessory_gear_set_gear_idx').on(
      table.gearSetId,
      table.gearId,
    ),
    index('gear_set_accessory_gear_gear_id_idx').on(table.gearId),
  ],
)

export const gearSetsRelations = relations(gearSets, ({ one, many }) => ({
  machine: one(gear, {
    fields: [gearSets.machineId],
    references: [gear.id],
    relationName: 'gearSetMachine',
  }),
  grinder: one(gear, {
    fields: [gearSets.grinderId],
    references: [gear.id],
    relationName: 'gearSetGrinder',
  }),
  basket: one(gear, {
    fields: [gearSets.basketId],
    references: [gear.id],
    relationName: 'gearSetBasket',
  }),
  accessoryGearLinks: many(gearSetAccessoryGear),
}))

export const gearSetAccessoryGearRelations = relations(
  gearSetAccessoryGear,
  ({ one }) => ({
    gearSet: one(gearSets, {
      fields: [gearSetAccessoryGear.gearSetId],
      references: [gearSets.id],
    }),
    gear: one(gear, {
      fields: [gearSetAccessoryGear.gearId],
      references: [gear.id],
    }),
  }),
)

export const gearImages = pgTable(
  'gear_images',
  {
    id: serial('id').primaryKey(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    isThumbnail: boolean('is_thumbnail').default(false).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('gear_images_gear_id_idx').on(table.gearId),
    uniqueIndex('gear_images_one_thumbnail_idx')
      .on(table.gearId)
      .where(sql`${table.isThumbnail} = true`),
  ],
)

export const gearImagesRelations = relations(gearImages, ({ one }) => ({
  gear: one(gear, {
    fields: [gearImages.gearId],
    references: [gear.id],
  }),
}))

export const brewingMethods = pgTable('brewing_methods', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  enabledParameters: text('enabled_parameters')
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  timerEnabled: boolean('timer_enabled').default(false).notNull(),
  ...timestamps(),
})

export const brewingMethodDrinkTypes = pgTable(
  'brewing_method_drink_types',
  {
    id: serial('id').primaryKey(),
    brewingMethodId: integer('brewing_method_id')
      .references(() => brewingMethods.id, { onDelete: 'cascade' })
      .notNull(),
    drinkTypeId: integer('drink_type_id')
      .references(() => drinkTypes.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('brewing_method_drink_types_method_type_idx').on(
      table.brewingMethodId,
      table.drinkTypeId,
    ),
    index('brewing_method_drink_types_drink_type_id_idx').on(table.drinkTypeId),
  ],
)

export const brewingMethodDrinkTypesRelations = relations(
  brewingMethodDrinkTypes,
  ({ one }) => ({
    brewingMethod: one(brewingMethods, {
      fields: [brewingMethodDrinkTypes.brewingMethodId],
      references: [brewingMethods.id],
    }),
    drinkType: one(drinkTypes, {
      fields: [brewingMethodDrinkTypes.drinkTypeId],
      references: [drinkTypes.id],
    }),
  }),
)

const shotContextColumns = () => ({
  brewingMethodId: integer('brewing_method_id')
    .references(() => brewingMethods.id, { onDelete: 'restrict' })
    .notNull(),
  beanId: integer('bean_id').references(() => beans.id, {
    onDelete: 'set null',
  }),
})

const shotParameterColumns = (dosePrecision = 6) => ({
  machineId: integer('machine_id').references(() => gear.id, {
    onDelete: 'set null',
  }),
  doseGrams: decimal('dose_grams', { precision: dosePrecision, scale: 2 }),
  brewWaterGrams: decimal('brew_water_grams', { precision: 7, scale: 2 }),
  ratioBasis: text('ratio_basis'),
  grinderId: integer('grinder_id').references(() => gear.id, {
    onDelete: 'set null',
  }),
  grindSetting: text('grind_setting'),
  yieldGrams: decimal('yield_grams', { precision: 6, scale: 2 }),
  shotTimeSeconds: decimal('shot_time_seconds', { precision: 8, scale: 2 }),
  targetTimeSeconds: decimal('target_time_seconds', {
    precision: 8,
    scale: 2,
  }),
  brewTemperatureCelsius: decimal('brew_temperature_celsius', {
    precision: 4,
    scale: 1,
  }),
  preinfusionTimeSeconds: decimal('preinfusion_time_seconds', {
    precision: 5,
    scale: 2,
  }),
  preinfusionPressureBar: decimal('preinfusion_pressure_bar', {
    precision: 4,
    scale: 2,
  }),
  bloomTimeSeconds: decimal('bloom_time_seconds', { precision: 5, scale: 2 }),
  brewPressureBar: decimal('brew_pressure_bar', { precision: 4, scale: 2 }),
  flowRateMlPerSecond: decimal('flow_rate_ml_per_second', {
    precision: 4,
    scale: 2,
  }),
  basketId: integer('basket_id').references(() => gear.id, {
    onDelete: 'set null',
  }),
  usesPuckScreen: boolean('uses_puck_screen'),
  paperFilterPosition: text('paper_filter_position'),
  distributionMethod: text('distribution_method'),
  tampForceKg: decimal('tamp_force_kg', { precision: 5, scale: 2 }),
})

export const recipes = pgTable(
  'recipes',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    drinkTypeId: integer('drink_type_id').references(() => drinkTypes.id, {
      onDelete: 'set null',
    }),
    ...shotContextColumns(),
    ...shotParameterColumns(5),
    ...timestamps(),
  },
  (table) => [
    check(
      'recipes_ratio_basis_check',
      sql`${table.ratioBasis} in ('target_yield', 'brew_water')`,
    ),
    check(
      'recipes_paper_filter_position_check',
      sql`${table.paperFilterPosition} in ('none', 'top', 'bottom', 'both')`,
    ),
    check(
      'recipes_measurements_nonnegative',
      sql`(${table.doseGrams} is null or ${table.doseGrams} >= 0)
        and (${table.brewWaterGrams} is null or ${table.brewWaterGrams} >= 0)
        and (${table.yieldGrams} is null or ${table.yieldGrams} >= 0)
        and (${table.shotTimeSeconds} is null or ${table.shotTimeSeconds} >= 0)
        and (${table.targetTimeSeconds} is null or ${table.targetTimeSeconds} >= 0)
        and (${table.brewTemperatureCelsius} is null or ${table.brewTemperatureCelsius} >= 0)
        and (${table.preinfusionTimeSeconds} is null or ${table.preinfusionTimeSeconds} >= 0)
        and (${table.preinfusionPressureBar} is null or ${table.preinfusionPressureBar} >= 0)
        and (${table.bloomTimeSeconds} is null or ${table.bloomTimeSeconds} >= 0)
        and (${table.brewPressureBar} is null or ${table.brewPressureBar} >= 0)
        and (${table.flowRateMlPerSecond} is null or ${table.flowRateMlPerSecond} >= 0)
        and (${table.tampForceKg} is null or ${table.tampForceKg} >= 0)`,
    ),
    index('recipes_brewing_method_id_idx').on(table.brewingMethodId),
    index('recipes_bean_id_idx').on(table.beanId),
    index('recipes_drink_type_id_idx').on(table.drinkTypeId),
  ],
)

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  brewingMethod: one(brewingMethods, {
    fields: [recipes.brewingMethodId],
    references: [brewingMethods.id],
  }),
  bean: one(beans, {
    fields: [recipes.beanId],
    references: [beans.id],
  }),
  drinkType: one(drinkTypes, {
    fields: [recipes.drinkTypeId],
    references: [drinkTypes.id],
  }),
  machine: one(gear, {
    fields: [recipes.machineId],
    references: [gear.id],
    relationName: 'recipeMachine',
  }),
  grinder: one(gear, {
    fields: [recipes.grinderId],
    references: [gear.id],
    relationName: 'recipeGrinder',
  }),
  basket: one(gear, {
    fields: [recipes.basketId],
    references: [gear.id],
    relationName: 'recipeBasket',
  }),
  accessoryGearLinks: many(recipeAccessoryGear),
}))

export const coffeeShops = pgTable(
  'coffee_shops',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    website: text('website'),
    instagramHandle: text('instagram_handle'),
    notes: text('notes'),
    rating: integer('rating'),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    wantsToVisit: boolean('wants_to_visit').default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    check('coffee_shops_rating_check', sql`${table.rating} between 1 and 5`),
    check(
      'coffee_shops_latitude_check',
      sql`${table.latitude} between -90 and 90`,
    ),
    check(
      'coffee_shops_longitude_check',
      sql`${table.longitude} between -180 and 180`,
    ),
    index('coffee_shops_created_at_idx').on(table.createdAt),
    index('coffee_shops_city_idx').on(table.city),
  ],
)

export const coffeeShopsRelations = relations(coffeeShops, ({ many }) => ({
  images: many(coffeeShopImages),
  cafeVisits: many(cafeVisits),
}))

export const coffeeShopImages = pgTable(
  'coffee_shop_images',
  {
    id: serial('id').primaryKey(),
    coffeeShopId: integer('coffee_shop_id')
      .references(() => coffeeShops.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    createdAt: createdAt(),
  },
  (table) => [index('coffee_shop_images_shop_id_idx').on(table.coffeeShopId)],
)

export const coffeeShopImagesRelations = relations(
  coffeeShopImages,
  ({ one }) => ({
    coffeeShop: one(coffeeShops, {
      fields: [coffeeShopImages.coffeeShopId],
      references: [coffeeShops.id],
    }),
  }),
)

export const shots = pgTable(
  'brews',
  {
    id: serial('id').primaryKey(),
    brewedAt: timestamp('brewed_at').defaultNow().notNull(),
    ...shotContextColumns(),
    drinkTypeId: integer('drink_type_id').references(() => drinkTypes.id, {
      onDelete: 'set null',
    }),
    machineSettingRevisionId: integer('machine_setting_revision_id').references(
      () => espressoMachineSettingRevisions.id,
      { onDelete: 'set null' },
    ),
    ...shotParameterColumns(),
    rating: integer('rating'),
    extractionBalance: integer('extraction_balance'),
    bitterness: integer('bitterness'),
    acidity: integer('acidity'),
    sweetness: integer('sweetness'),
    body: integer('body'),
    astringency: integer('astringency'),
    notes: text('notes'),
    ...timestamps(),
  },
  (table) => [
    check(
      'brews_ratio_basis_check',
      sql`${table.ratioBasis} in ('target_yield', 'brew_water')`,
    ),
    check(
      'brews_paper_filter_position_check',
      sql`${table.paperFilterPosition} in ('none', 'top', 'bottom', 'both')`,
    ),
    check('brews_rating_check', sql`${table.rating} between 1 and 5`),
    check(
      'brews_extraction_balance_check',
      sql`${table.extractionBalance} between 1 and 5`,
    ),
    check(
      'brews_sensory_ratings_check',
      sql`(${table.bitterness} is null or ${table.bitterness} between 1 and 5)
        and (${table.acidity} is null or ${table.acidity} between 1 and 5)
        and (${table.sweetness} is null or ${table.sweetness} between 1 and 5)
        and (${table.body} is null or ${table.body} between 1 and 5)
        and (${table.astringency} is null or ${table.astringency} between 1 and 5)`,
    ),
    check(
      'brews_measurements_nonnegative',
      sql`(${table.doseGrams} is null or ${table.doseGrams} >= 0)
        and (${table.brewWaterGrams} is null or ${table.brewWaterGrams} >= 0)
        and (${table.yieldGrams} is null or ${table.yieldGrams} >= 0)
        and (${table.shotTimeSeconds} is null or ${table.shotTimeSeconds} >= 0)
        and (${table.targetTimeSeconds} is null or ${table.targetTimeSeconds} >= 0)
        and (${table.brewTemperatureCelsius} is null or ${table.brewTemperatureCelsius} >= 0)
        and (${table.preinfusionTimeSeconds} is null or ${table.preinfusionTimeSeconds} >= 0)
        and (${table.preinfusionPressureBar} is null or ${table.preinfusionPressureBar} >= 0)
        and (${table.bloomTimeSeconds} is null or ${table.bloomTimeSeconds} >= 0)
        and (${table.brewPressureBar} is null or ${table.brewPressureBar} >= 0)
        and (${table.flowRateMlPerSecond} is null or ${table.flowRateMlPerSecond} >= 0)
        and (${table.tampForceKg} is null or ${table.tampForceKg} >= 0)`,
    ),
    index('brews_created_at_idx').on(table.createdAt),
    index('brews_brewed_at_idx').on(table.brewedAt),
    index('brews_brewing_method_id_idx').on(table.brewingMethodId),
    index('brews_bean_id_idx').on(table.beanId),
    index('brews_drink_type_id_idx').on(table.drinkTypeId),
    index('brews_machine_setting_revision_id_idx').on(
      table.machineSettingRevisionId,
    ),
    index('brews_machine_id_idx').on(table.machineId),
    index('brews_grinder_id_idx').on(table.grinderId),
    index('brews_basket_id_idx').on(table.basketId),
  ],
)

export const shotsRelations = relations(shots, ({ one, many }) => ({
  machineSettingRevision: one(espressoMachineSettingRevisions, {
    fields: [shots.machineSettingRevisionId],
    references: [espressoMachineSettingRevisions.id],
  }),
  brewingMethod: one(brewingMethods, {
    fields: [shots.brewingMethodId],
    references: [brewingMethods.id],
  }),
  drinkType: one(drinkTypes, {
    fields: [shots.drinkTypeId],
    references: [drinkTypes.id],
  }),
  bean: one(beans, {
    fields: [shots.beanId],
    references: [beans.id],
  }),
  machine: one(gear, {
    fields: [shots.machineId],
    references: [gear.id],
    relationName: 'shotMachine',
  }),
  grinder: one(gear, {
    fields: [shots.grinderId],
    references: [gear.id],
    relationName: 'shotGrinder',
  }),
  basket: one(gear, {
    fields: [shots.basketId],
    references: [gear.id],
    relationName: 'shotBasket',
  }),
  accessoryGearLinks: many(shotAccessoryGear),
  tasteTags: many(shotTasteTags),
  images: many(shotImages),
  drinkOptions: many(shotDrinkOptions),
}))

export const shotDrinkOptions = pgTable(
  'brew_drink_options',
  {
    id: serial('id').primaryKey(),
    shotId: integer('brew_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    optionValueId: integer('option_value_id')
      .references(() => drinkOptionValues.id, { onDelete: 'restrict' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('brew_drink_options_brew_value_idx').on(
      table.shotId,
      table.optionValueId,
    ),
    index('brew_drink_options_value_id_idx').on(table.optionValueId),
  ],
)

export const shotDrinkOptionsRelations = relations(
  shotDrinkOptions,
  ({ one }) => ({
    shot: one(shots, {
      fields: [shotDrinkOptions.shotId],
      references: [shots.id],
    }),
    optionValue: one(drinkOptionValues, {
      fields: [shotDrinkOptions.optionValueId],
      references: [drinkOptionValues.id],
    }),
  }),
)

export const recipeAccessoryGear = pgTable(
  'recipe_accessory_gear',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('recipe_accessory_gear_recipe_gear_idx').on(
      table.recipeId,
      table.gearId,
    ),
    index('recipe_accessory_gear_gear_id_idx').on(table.gearId),
  ],
)

export const recipeAccessoryGearRelations = relations(
  recipeAccessoryGear,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeAccessoryGear.recipeId],
      references: [recipes.id],
    }),
    gear: one(gear, {
      fields: [recipeAccessoryGear.gearId],
      references: [gear.id],
    }),
  }),
)

export const shotAccessoryGear = pgTable(
  'brew_accessory_gear',
  {
    id: serial('id').primaryKey(),
    shotId: integer('brew_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('brew_accessory_gear_brew_gear_idx').on(
      table.shotId,
      table.gearId,
    ),
    index('brew_accessory_gear_gear_id_idx').on(table.gearId),
  ],
)

export const shotAccessoryGearRelations = relations(
  shotAccessoryGear,
  ({ one }) => ({
    shot: one(shots, {
      fields: [shotAccessoryGear.shotId],
      references: [shots.id],
    }),
    gear: one(gear, {
      fields: [shotAccessoryGear.gearId],
      references: [gear.id],
    }),
  }),
)

export const brewingMethodsRelations = relations(
  brewingMethods,
  ({ many }) => ({
    drinkTypeLinks: many(brewingMethodDrinkTypes),
    recipes: many(recipes),
    shots: many(shots),
  }),
)

export const shotImages = pgTable(
  'brew_images',
  {
    id: serial('id').primaryKey(),
    shotId: integer('brew_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    createdAt: createdAt(),
  },
  (table) => [index('brew_images_brew_id_idx').on(table.shotId)],
)

export const shotImagesRelations = relations(shotImages, ({ one }) => ({
  shot: one(shots, {
    fields: [shotImages.shotId],
    references: [shots.id],
  }),
}))

export const tasteTags = pgTable(
  'taste_tags',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    category: text('category'),
    extractionAxis: decimal('extraction_axis', { precision: 3, scale: 2 }),
    strengthAxis: decimal('strength_axis', { precision: 3, scale: 2 }),
    hint: text('hint').default('').notNull(),
  },
  (table) => [
    check(
      'taste_tags_extraction_axis_check',
      sql`${table.extractionAxis} between -1 and 1`,
    ),
    check(
      'taste_tags_strength_axis_check',
      sql`${table.strengthAxis} between -1 and 1`,
    ),
  ],
)

export const tasteTagsRelations = relations(tasteTags, ({ many }) => ({
  shotTasteTags: many(shotTasteTags),
  cafeVisitTasteTags: many(cafeVisitTasteTags),
}))

export const shotTasteTags = pgTable(
  'brew_taste_tags',
  {
    id: serial('id').primaryKey(),
    shotId: integer('brew_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    tasteTagId: integer('taste_tag_id')
      .references(() => tasteTags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('brew_taste_tags_brew_tag_idx').on(
      table.shotId,
      table.tasteTagId,
    ),
    index('brew_taste_tags_taste_tag_id_idx').on(table.tasteTagId),
  ],
)

export const shotTasteTagsRelations = relations(shotTasteTags, ({ one }) => ({
  shot: one(shots, {
    fields: [shotTasteTags.shotId],
    references: [shots.id],
  }),
  tasteTag: one(tasteTags, {
    fields: [shotTasteTags.tasteTagId],
    references: [tasteTags.id],
  }),
}))

export const cafeVisits = pgTable(
  'cafe_visits',
  {
    id: serial('id').primaryKey(),
    coffeeShopId: integer('coffee_shop_id').references(() => coffeeShops.id, {
      onDelete: 'set null',
    }),
    beanId: integer('bean_id').references(() => beans.id, {
      onDelete: 'set null',
    }),
    drinkTypeId: integer('drink_type_id').references(() => drinkTypes.id, {
      onDelete: 'set null',
    }),
    price: decimal('price', { precision: 6, scale: 2 }),
    currency: text('currency').default('EUR'),
    rating: integer('rating'),
    notes: text('notes'),
    visitedAt: timestamp('visited_at').defaultNow().notNull(),
    ...timestamps(),
  },
  (table) => [
    check('cafe_visits_price_nonnegative', sql`${table.price} >= 0`),
    check('cafe_visits_rating_check', sql`${table.rating} between 1 and 5`),
    check(
      'cafe_visits_currency_check',
      sql`${table.currency} in ('EUR', 'USD', 'GBP', 'CHF')`,
    ),
    index('cafe_visits_visited_at_idx').on(table.visitedAt),
    index('cafe_visits_coffee_shop_id_idx').on(table.coffeeShopId),
    index('cafe_visits_bean_id_idx').on(table.beanId),
    index('cafe_visits_drink_type_id_idx').on(table.drinkTypeId),
  ],
)

export const cafeVisitsRelations = relations(cafeVisits, ({ one, many }) => ({
  coffeeShop: one(coffeeShops, {
    fields: [cafeVisits.coffeeShopId],
    references: [coffeeShops.id],
  }),
  bean: one(beans, {
    fields: [cafeVisits.beanId],
    references: [beans.id],
  }),
  drinkType: one(drinkTypes, {
    fields: [cafeVisits.drinkTypeId],
    references: [drinkTypes.id],
  }),
  tasteTags: many(cafeVisitTasteTags),
  images: many(cafeVisitImages),
  drinkOptions: many(cafeVisitDrinkOptions),
}))

export const cafeVisitDrinkOptions = pgTable(
  'cafe_visit_drink_options',
  {
    id: serial('id').primaryKey(),
    cafeVisitId: integer('cafe_visit_id')
      .references(() => cafeVisits.id, { onDelete: 'cascade' })
      .notNull(),
    optionValueId: integer('option_value_id')
      .references(() => drinkOptionValues.id, { onDelete: 'restrict' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('cafe_visit_drink_options_visit_value_idx').on(
      table.cafeVisitId,
      table.optionValueId,
    ),
    index('cafe_visit_drink_options_value_id_idx').on(table.optionValueId),
  ],
)

export const cafeVisitDrinkOptionsRelations = relations(
  cafeVisitDrinkOptions,
  ({ one }) => ({
    cafeVisit: one(cafeVisits, {
      fields: [cafeVisitDrinkOptions.cafeVisitId],
      references: [cafeVisits.id],
    }),
    optionValue: one(drinkOptionValues, {
      fields: [cafeVisitDrinkOptions.optionValueId],
      references: [drinkOptionValues.id],
    }),
  }),
)

export const drinkTypesRelations = relations(drinkTypes, ({ many }) => ({
  brewingMethodLinks: many(brewingMethodDrinkTypes),
  optionGroupLinks: many(drinkTypeOptionGroups),
  shots: many(shots),
  cafeVisits: many(cafeVisits),
}))

export const drinkOptionValuesRelations = relations(
  drinkOptionValues,
  ({ one, many }) => ({
    group: one(drinkOptionGroups, {
      fields: [drinkOptionValues.groupId],
      references: [drinkOptionGroups.id],
    }),
    shotLinks: many(shotDrinkOptions),
    cafeVisitLinks: many(cafeVisitDrinkOptions),
  }),
)

export const cafeVisitImages = pgTable(
  'cafe_visit_images',
  {
    id: serial('id').primaryKey(),
    cafeVisitId: integer('cafe_visit_id')
      .references(() => cafeVisits.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    createdAt: createdAt(),
  },
  (table) => [index('cafe_visit_images_visit_id_idx').on(table.cafeVisitId)],
)

export const cafeVisitImagesRelations = relations(
  cafeVisitImages,
  ({ one }) => ({
    cafeVisit: one(cafeVisits, {
      fields: [cafeVisitImages.cafeVisitId],
      references: [cafeVisits.id],
    }),
  }),
)

export const cafeVisitTasteTags = pgTable(
  'cafe_visit_taste_tags',
  {
    id: serial('id').primaryKey(),
    cafeVisitId: integer('cafe_visit_id')
      .references(() => cafeVisits.id, { onDelete: 'cascade' })
      .notNull(),
    tasteTagId: integer('taste_tag_id')
      .references(() => tasteTags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('cafe_visit_taste_tags_visit_tag_idx').on(
      table.cafeVisitId,
      table.tasteTagId,
    ),
    index('cafe_visit_taste_tags_taste_tag_id_idx').on(table.tasteTagId),
  ],
)

export const cafeVisitTasteTagsRelations = relations(
  cafeVisitTasteTags,
  ({ one }) => ({
    cafeVisit: one(cafeVisits, {
      fields: [cafeVisitTasteTags.cafeVisitId],
      references: [cafeVisits.id],
    }),
    tasteTag: one(tasteTags, {
      fields: [cafeVisitTasteTags.tasteTagId],
      references: [tasteTags.id],
    }),
  }),
)

export const mediaCleanupJobs = pgTable(
  'media_cleanup_jobs',
  {
    id: serial('id').primaryKey(),
    storagePath: text('storage_path').notNull().unique(),
    attempts: integer('attempts').default(0).notNull(),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index('media_cleanup_jobs_next_attempt_at_idx').on(table.nextAttemptAt),
  ],
)
