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
    defaultMapLatitude: doublePrecision('default_map_latitude'),
    defaultMapLongitude: doublePrecision('default_map_longitude'),
    defaultMapLabel: text('default_map_label'),
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
    completionTokens: integer('completion_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    durationMs: integer('duration_ms'),
    completedAt: timestamp('completed_at'),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'ai_request_logs_status_check',
      sql`${table.status} in ('in_progress', 'succeeded', 'failed', 'aborted')`,
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

export const machineSettings = pgTable(
  'machine_settings',
  {
    gearId: integer('gear_id')
      .primaryKey()
      .references(() => gear.id, { onDelete: 'cascade' }),
    brewPressureOpvBar: decimal('brew_pressure_opv_bar', {
      precision: 4,
      scale: 2,
    }),
    supportsPreinfusion: boolean('supports_preinfusion'),
    defaultPreinfusionEnabled: boolean('default_preinfusion_enabled'),
    defaultPreinfusionTimeSeconds: decimal('default_preinfusion_time_seconds', {
      precision: 5,
      scale: 2,
    }),
    defaultPreinfusionPressureBar: decimal('default_preinfusion_pressure_bar', {
      precision: 4,
      scale: 2,
    }),
    defaultFlowLimitMlPerSecond: decimal('default_flow_limit_ml_per_second', {
      precision: 4,
      scale: 2,
    }),
    temperatureOffsetCelsius: decimal('temperature_offset_celsius', {
      precision: 4,
      scale: 1,
    }),
    volumetricShotVolumeMl: decimal('volumetric_shot_volume_ml', {
      precision: 6,
      scale: 2,
    }),
    autoStopMode: text('auto_stop_mode'),
    steamTemperatureCelsius: decimal('steam_temperature_celsius', {
      precision: 4,
      scale: 1,
    }),
    steamPressureBar: decimal('steam_pressure_bar', {
      precision: 4,
      scale: 2,
    }),
  },
  (table) => [
    check(
      'machine_settings_auto_stop_mode_check',
      sql`${table.autoStopMode} in ('manual', 'weight', 'time', 'volume')`,
    ),
    check(
      'machine_settings_measurements_nonnegative',
      sql`(${table.brewPressureOpvBar} is null or ${table.brewPressureOpvBar} >= 0)
        and (${table.defaultPreinfusionTimeSeconds} is null or ${table.defaultPreinfusionTimeSeconds} >= 0)
        and (${table.defaultPreinfusionPressureBar} is null or ${table.defaultPreinfusionPressureBar} >= 0)
        and (${table.defaultFlowLimitMlPerSecond} is null or ${table.defaultFlowLimitMlPerSecond} >= 0)
        and (${table.volumetricShotVolumeMl} is null or ${table.volumetricShotVolumeMl} >= 0)
        and (${table.steamTemperatureCelsius} is null or ${table.steamTemperatureCelsius} >= 0)
        and (${table.steamPressureBar} is null or ${table.steamPressureBar} >= 0)`,
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
  },
  (table) => [
    check(
      'basket_details_dose_nonnegative',
      sql`${table.nominalDoseGrams} >= 0`,
    ),
  ],
)

export const gearRelations = relations(gear, ({ one, many }) => ({
  images: many(gearImages),
  machineSettings: one(machineSettings),
  basketDetails: one(basketDetails),
  shots: many(shots, { relationName: 'shotMachine' }),
  shotAccessoryLinks: many(shotAccessoryGear),
  recipeAccessoryLinks: many(recipeAccessoryGear),
}))

export const machineSettingsRelations = relations(
  machineSettings,
  ({ one }) => ({
    gear: one(gear, {
      fields: [machineSettings.gearId],
      references: [gear.id],
    }),
  }),
)

export const basketDetailsRelations = relations(basketDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [basketDetails.gearId],
    references: [gear.id],
  }),
}))

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
  shots: many(shots),
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
  'shots',
  {
    id: serial('id').primaryKey(),
    brewedAt: timestamp('brewed_at').defaultNow().notNull(),
    ...shotContextColumns(),
    recipeId: integer('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    ...shotParameterColumns(),
    rating: integer('rating'),
    notes: text('notes'),
    ...timestamps(),
  },
  (table) => [
    check(
      'shots_ratio_basis_check',
      sql`${table.ratioBasis} in ('target_yield', 'brew_water')`,
    ),
    check(
      'shots_paper_filter_position_check',
      sql`${table.paperFilterPosition} in ('none', 'top', 'bottom', 'both')`,
    ),
    check('shots_rating_check', sql`${table.rating} between 1 and 5`),
    check(
      'shots_measurements_nonnegative',
      sql`(${table.doseGrams} is null or ${table.doseGrams} >= 0)
        and (${table.brewWaterGrams} is null or ${table.brewWaterGrams} >= 0)
        and (${table.yieldGrams} is null or ${table.yieldGrams} >= 0)
        and (${table.shotTimeSeconds} is null or ${table.shotTimeSeconds} >= 0)
        and (${table.brewTemperatureCelsius} is null or ${table.brewTemperatureCelsius} >= 0)
        and (${table.preinfusionTimeSeconds} is null or ${table.preinfusionTimeSeconds} >= 0)
        and (${table.preinfusionPressureBar} is null or ${table.preinfusionPressureBar} >= 0)
        and (${table.bloomTimeSeconds} is null or ${table.bloomTimeSeconds} >= 0)
        and (${table.brewPressureBar} is null or ${table.brewPressureBar} >= 0)
        and (${table.flowRateMlPerSecond} is null or ${table.flowRateMlPerSecond} >= 0)
        and (${table.tampForceKg} is null or ${table.tampForceKg} >= 0)`,
    ),
    index('shots_created_at_idx').on(table.createdAt),
    index('shots_brewed_at_idx').on(table.brewedAt),
    index('shots_brewing_method_id_idx').on(table.brewingMethodId),
    index('shots_bean_id_idx').on(table.beanId),
    index('shots_recipe_id_idx').on(table.recipeId),
    index('shots_machine_id_idx').on(table.machineId),
    index('shots_grinder_id_idx').on(table.grinderId),
    index('shots_basket_id_idx').on(table.basketId),
  ],
)

export const shotsRelations = relations(shots, ({ one, many }) => ({
  brewingMethod: one(brewingMethods, {
    fields: [shots.brewingMethodId],
    references: [brewingMethods.id],
  }),
  bean: one(beans, {
    fields: [shots.beanId],
    references: [beans.id],
  }),
  recipe: one(recipes, {
    fields: [shots.recipeId],
    references: [recipes.id],
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
}))

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
  'shot_accessory_gear',
  {
    id: serial('id').primaryKey(),
    shotId: integer('shot_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    gearId: integer('gear_id')
      .references(() => gear.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('shot_accessory_gear_shot_gear_idx').on(
      table.shotId,
      table.gearId,
    ),
    index('shot_accessory_gear_gear_id_idx').on(table.gearId),
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
    recipes: many(recipes),
    shots: many(shots),
  }),
)

export const shotImages = pgTable(
  'shot_images',
  {
    id: serial('id').primaryKey(),
    shotId: integer('shot_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    ...imageFile(),
    createdAt: createdAt(),
  },
  (table) => [index('shot_images_shot_id_idx').on(table.shotId)],
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
  'shot_taste_tags',
  {
    id: serial('id').primaryKey(),
    shotId: integer('shot_id')
      .references(() => shots.id, { onDelete: 'cascade' })
      .notNull(),
    tasteTagId: integer('taste_tag_id')
      .references(() => tasteTags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('shot_taste_tags_shot_tag_idx').on(
      table.shotId,
      table.tasteTagId,
    ),
    index('shot_taste_tags_taste_tag_id_idx').on(table.tasteTagId),
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
    drinkName: text('drink_name'),
    drinkType: text('drink_type'),
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
  tasteTags: many(cafeVisitTasteTags),
  images: many(cafeVisitImages),
}))

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
