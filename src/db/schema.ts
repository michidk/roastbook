import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
  check,
  primaryKey,
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

const timestamps = () => ({
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

const archiveState = () => ({
  isArchived: boolean("is_archived").default(false).notNull(),
  ...timestamps(),
})

const imageFile = () => ({
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
})

const createdAt = () => timestamp("created_at").defaultNow().notNull()

export const gearTypeEnum = pgEnum("gear_type", [
  "espresso_machine",
  "grinder",
  "kettle",
  "scale",
  "tamper",
  "wdt",
  "basket",
  "other",
])

export const roastLevelEnum = pgEnum("roast_level", [
  "light",
  "medium_light",
  "medium",
  "medium_dark",
  "dark",
])

export const brewingMethodEnum = pgEnum("brewing_method", [
  "espresso",
  "pourover",
  "aeropress",
  "french_press",
  "moka_pot",
  "cold_brew",
  "other",
])

export const roasters = pgTable("roasters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  country: text("country"),
  website: text("website"),
  instagramHandle: text("instagram_handle"),
  notes: text("notes"),
  ...timestamps(),
})

export const roastersRelations = relations(roasters, ({ many }) => ({
  beans: many(beans),
}))

export const beans = pgTable("beans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roaster: text("roaster"), // Legacy text field
  roasterId: integer("roaster_id").references(() => roasters.id, { onDelete: "set null" }),
  origin: text("origin"),
  region: text("region"),
  farm: text("farm"),
  variety: text("variety"),
  process: text("process"),
  roastLevel: roastLevelEnum("roast_level"),
  roastDate: timestamp("roast_date"),
  weight: decimal("weight", { precision: 6, scale: 2 }),
  price: decimal("price", { precision: 8, scale: 2 }),
  priceCurrency: text("price_currency").default("EUR"),
  shopUrl: text("shop_url"),
  notes: text("notes"),
  ...archiveState(),
})

export const beansRelations = relations(beans, ({ one, many }) => ({
  roasterRef: one(roasters, {
    fields: [beans.roasterId],
    references: [roasters.id],
  }),
  images: many(beanImages),
  shots: many(shots),
}))

export const beanImages = pgTable("bean_images", {
  id: serial("id").primaryKey(),
  beanId: integer("bean_id")
    .references(() => beans.id, { onDelete: "cascade" })
    .notNull(),
  ...imageFile(),
  isThumbnail: boolean("is_thumbnail").default(false).notNull(),
  createdAt: createdAt(),
})

export const beanImagesRelations = relations(beanImages, ({ one }) => ({
  bean: one(beans, {
    fields: [beanImages.beanId],
    references: [beans.id],
  }),
}))

export const gear = pgTable("gear", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  type: gearTypeEnum("type").notNull(),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 8, scale: 2 }),
  priceCurrency: text("price_currency").default("EUR"),
  manualUrl: text("manual_url"),
  productUrl: text("product_url"),
  notes: text("notes"),
  ...archiveState(),
})

export const machineSettings = pgTable(
  "machine_settings",
  {
    gearId: integer("gear_id")
      .primaryKey()
      .references(() => gear.id, { onDelete: "cascade" }),
    brewPressureOpvBar: decimal("brew_pressure_opv_bar", {
      precision: 4,
      scale: 2,
    }),
    supportsPreinfusion: boolean("supports_preinfusion"),
    defaultPreinfusionEnabled: boolean("default_preinfusion_enabled"),
    defaultPreinfusionTimeSeconds: decimal(
      "default_preinfusion_time_seconds",
      { precision: 5, scale: 2 },
    ),
    defaultPreinfusionPressureBar: decimal(
      "default_preinfusion_pressure_bar",
      { precision: 4, scale: 2 },
    ),
    defaultFlowLimitMlPerSecond: decimal(
      "default_flow_limit_ml_per_second",
      { precision: 4, scale: 2 },
    ),
    temperatureOffsetCelsius: decimal("temperature_offset_celsius", {
      precision: 4,
      scale: 1,
    }),
    volumetricShotVolumeMl: decimal("volumetric_shot_volume_ml", {
      precision: 6,
      scale: 2,
    }),
    autoStopMode: text("auto_stop_mode"),
    steamTemperatureCelsius: decimal("steam_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    steamPressureBar: decimal("steam_pressure_bar", {
      precision: 4,
      scale: 2,
    }),
  },
  (table) => [
    check(
      "machine_settings_auto_stop_mode_check",
      sql`${table.autoStopMode} in ('manual', 'weight', 'time', 'volume')`,
    ),
  ],
)

export const basketDetails = pgTable("basket_details", {
  gearId: integer("gear_id")
    .primaryKey()
    .references(() => gear.id, { onDelete: "cascade" }),
  nominalDoseGrams: decimal("nominal_dose_grams", {
    precision: 5,
    scale: 2,
  }),
})

export const gearRelations = relations(gear, ({ one, many }) => ({
  images: many(gearImages),
  recipeGear: many(recipeGear),
  machineSettings: one(machineSettings),
  basketDetails: one(basketDetails),
  grinderRecipes: many(recipes, { relationName: "recipeGrinder" }),
  basketRecipes: many(recipes, { relationName: "recipeBasket" }),
  shots: many(shots, { relationName: "shotMachine" }),
}))

export const machineSettingsRelations = relations(machineSettings, ({ one }) => ({
  gear: one(gear, {
    fields: [machineSettings.gearId],
    references: [gear.id],
  }),
}))

export const basketDetailsRelations = relations(basketDetails, ({ one }) => ({
  gear: one(gear, {
    fields: [basketDetails.gearId],
    references: [gear.id],
  }),
}))

export const gearImages = pgTable("gear_images", {
  id: serial("id").primaryKey(),
  gearId: integer("gear_id")
    .references(() => gear.id, { onDelete: "cascade" })
    .notNull(),
  ...imageFile(),
  isThumbnail: boolean("is_thumbnail").default(false).notNull(),
  createdAt: createdAt(),
})

export const gearImagesRelations = relations(gearImages, ({ one }) => ({
  gear: one(gear, {
    fields: [gearImages.gearId],
    references: [gear.id],
  }),
}))

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brewingMethod: brewingMethodEnum("brewing_method")
      .default("espresso")
      .notNull(),
    beanId: integer("bean_id").references(() => beans.id, {
      onDelete: "set null",
    }),
    targetDoseGrams: decimal("target_dose_grams", {
      precision: 5,
      scale: 2,
    }),
    brewWaterGrams: decimal("brew_water_grams", {
      precision: 7,
      scale: 2,
    }),
    ratioBasis: text("ratio_basis"),
    grinderId: integer("grinder_id").references(() => gear.id, {
      onDelete: "set null",
    }),
    grindSetting: text("grind_setting"),
    targetYieldGrams: decimal("target_yield_grams", {
      precision: 6,
      scale: 2,
    }),
    targetTimeMinSeconds: decimal("target_time_min_seconds", {
      precision: 8,
      scale: 2,
    }),
    targetTimeMaxSeconds: decimal("target_time_max_seconds", {
      precision: 8,
      scale: 2,
    }),
    brewTemperatureCelsius: decimal("brew_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    preinfusionTimeSeconds: decimal("preinfusion_time_seconds", {
      precision: 5,
      scale: 2,
    }),
    preinfusionPressureBar: decimal("preinfusion_pressure_bar", {
      precision: 4,
      scale: 2,
    }),
    bloomTimeSeconds: decimal("bloom_time_seconds", {
      precision: 5,
      scale: 2,
    }),
    targetBrewPressureBar: decimal("target_brew_pressure_bar", {
      precision: 4,
      scale: 2,
    }),
    targetFlowRateMlPerSecond: decimal("target_flow_rate_ml_per_second", {
      precision: 4,
      scale: 2,
    }),
    basketId: integer("basket_id").references(() => gear.id, {
      onDelete: "set null",
    }),
    usesPuckScreen: boolean("uses_puck_screen"),
    paperFilterPosition: text("paper_filter_position"),
    distributionMethod: text("distribution_method"),
    tampForceKg: decimal("tamp_force_kg", { precision: 5, scale: 2 }),
    notes: text("notes"),
    ...archiveState(),
  },
  (table) => [
    check(
      "recipes_ratio_basis_check",
      sql`${table.ratioBasis} in ('target_yield', 'brew_water')`,
    ),
    check(
      "recipes_paper_filter_position_check",
      sql`${table.paperFilterPosition} in ('none', 'top', 'bottom', 'both')`,
    ),
    check(
      "recipes_target_time_range_check",
      sql`${table.targetTimeMinSeconds} is null or ${table.targetTimeMaxSeconds} is null or ${table.targetTimeMinSeconds} <= ${table.targetTimeMaxSeconds}`,
    ),
  ],
)

export const recipeEnabledFields = pgTable(
  "recipe_enabled_fields",
  {
    recipeId: integer("recipe_id")
      .references(() => recipes.id, { onDelete: "cascade" })
      .notNull(),
    fieldKey: text("field_key").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.fieldKey] }),
    check(
      "recipe_enabled_fields_key_check",
      sql`${table.fieldKey} in ('bean', 'target_dose', 'brew_water', 'grinder', 'grind_setting', 'target_yield', 'brew_ratio', 'target_time', 'brew_temperature', 'preinfusion_time', 'preinfusion_pressure', 'bloom_time', 'target_pressure', 'target_flow_rate', 'basket', 'puck_screen', 'paper_filter', 'distribution_method', 'tamp_force', 'accessories', 'notes')`,
    ),
  ],
)

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  bean: one(beans, {
    fields: [recipes.beanId],
    references: [beans.id],
  }),
  grinder: one(gear, {
    fields: [recipes.grinderId],
    references: [gear.id],
    relationName: "recipeGrinder",
  }),
  basket: one(gear, {
    fields: [recipes.basketId],
    references: [gear.id],
    relationName: "recipeBasket",
  }),
  enabledFields: many(recipeEnabledFields),
  gear: many(recipeGear),
  shots: many(shots),
}))

export const recipeEnabledFieldsRelations = relations(
  recipeEnabledFields,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeEnabledFields.recipeId],
      references: [recipes.id],
    }),
  }),
)

export const recipeGear = pgTable("recipe_gear", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  gearId: integer("gear_id")
    .references(() => gear.id, { onDelete: "cascade" })
    .notNull(),
})

export const recipeGearRelations = relations(recipeGear, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeGear.recipeId],
    references: [recipes.id],
  }),
  gear: one(gear, {
    fields: [recipeGear.gearId],
    references: [gear.id],
  }),
}))

export const coffeeShops = pgTable("coffee_shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  website: text("website"),
  instagramHandle: text("instagram_handle"),
  notes: text("notes"),
  rating: integer("rating"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  ...timestamps(),
})

export const coffeeShopsRelations = relations(coffeeShops, ({ many }) => ({
  images: many(coffeeShopImages),
  cafeVisits: many(cafeVisits),
}))

export const coffeeShopImages = pgTable("coffee_shop_images", {
  id: serial("id").primaryKey(),
  coffeeShopId: integer("coffee_shop_id")
    .references(() => coffeeShops.id, { onDelete: "cascade" })
    .notNull(),
  ...imageFile(),
  createdAt: createdAt(),
})

export const coffeeShopImagesRelations = relations(coffeeShopImages, ({ one }) => ({
  coffeeShop: one(coffeeShops, {
    fields: [coffeeShopImages.coffeeShopId],
    references: [coffeeShops.id],
  }),
}))

export const shots = pgTable("shots", {
  id: serial("id").primaryKey(),
  beanId: integer("bean_id").references(() => beans.id, { onDelete: "set null" }),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  machineId: integer("machine_id").references(() => gear.id, {
    onDelete: "set null",
  }),

  actualDoseGrams: decimal("actual_dose_grams", { precision: 6, scale: 2 }),
  actualYieldGrams: decimal("actual_yield_grams", { precision: 6, scale: 2 }),
  actualShotTimeSeconds: decimal("actual_shot_time_seconds", {
    precision: 6,
    scale: 2,
  }),
  grindSetting: text("grind_setting"),
  actualTemperatureCelsius: decimal("actual_temperature_celsius", {
    precision: 4,
    scale: 1,
  }),
  actualPressureBar: decimal("actual_pressure_bar", {
    precision: 4,
    scale: 2,
  }),

  rating: integer("rating"),
  notes: text("notes"),

  ...timestamps(),
})

export const shotsRelations = relations(shots, ({ one, many }) => ({
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
    relationName: "shotMachine",
  }),
  tasteTags: many(shotTasteTags),
  images: many(shotImages),
}))

export const shotImages = pgTable("shot_images", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id")
    .references(() => shots.id, { onDelete: "cascade" })
    .notNull(),
  ...imageFile(),
  createdAt: createdAt(),
})

export const shotImagesRelations = relations(shotImages, ({ one }) => ({
  shot: one(shots, {
    fields: [shotImages.shotId],
    references: [shots.id],
  }),
}))

export const tasteTags = pgTable("taste_tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category"),
  extractionAxis: decimal("extraction_axis", { precision: 3, scale: 2 }),
  strengthAxis: decimal("strength_axis", { precision: 3, scale: 2 }),
})

export const tasteTagsRelations = relations(tasteTags, ({ many }) => ({
  shotTasteTags: many(shotTasteTags),
  cafeVisitTasteTags: many(cafeVisitTasteTags),
}))

export const shotTasteTags = pgTable("shot_taste_tags", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id")
    .references(() => shots.id, { onDelete: "cascade" })
    .notNull(),
  tasteTagId: integer("taste_tag_id")
    .references(() => tasteTags.id, { onDelete: "cascade" })
    .notNull(),
})

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

export const cafeVisits = pgTable("cafe_visits", {
  id: serial("id").primaryKey(),
  coffeeShopId: integer("coffee_shop_id")
    .references(() => coffeeShops.id, { onDelete: "set null" }),
  beanId: integer("bean_id")
    .references(() => beans.id, { onDelete: "set null" }),
  drinkName: text("drink_name"),
  drinkType: text("drink_type"),
  price: decimal("price", { precision: 6, scale: 2 }),
  currency: text("currency").default("EUR"),
  rating: integer("rating"),
  notes: text("notes"),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
  ...timestamps(),
})

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

export const cafeVisitImages = pgTable("cafe_visit_images", {
  id: serial("id").primaryKey(),
  cafeVisitId: integer("cafe_visit_id")
    .references(() => cafeVisits.id, { onDelete: "cascade" })
    .notNull(),
  ...imageFile(),
  createdAt: createdAt(),
})

export const cafeVisitImagesRelations = relations(cafeVisitImages, ({ one }) => ({
  cafeVisit: one(cafeVisits, {
    fields: [cafeVisitImages.cafeVisitId],
    references: [cafeVisits.id],
  }),
}))

export const cafeVisitTasteTags = pgTable("cafe_visit_taste_tags", {
  id: serial("id").primaryKey(),
  cafeVisitId: integer("cafe_visit_id")
    .references(() => cafeVisits.id, { onDelete: "cascade" })
    .notNull(),
  tasteTagId: integer("taste_tag_id")
    .references(() => tasteTags.id, { onDelete: "cascade" })
    .notNull(),
})

export const cafeVisitTasteTagsRelations = relations(cafeVisitTasteTags, ({ one }) => ({
  cafeVisit: one(cafeVisits, {
    fields: [cafeVisitTasteTags.cafeVisitId],
    references: [cafeVisits.id],
  }),
  tasteTag: one(tasteTags, {
    fields: [cafeVisitTasteTags.tasteTagId],
    references: [tasteTags.id],
  }),
}))
