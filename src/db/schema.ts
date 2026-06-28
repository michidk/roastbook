import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const gearTypeEnum = pgEnum("gear_type", [
  "espresso_machine",
  "grinder",
  "kettle",
  "scale",
  "tamper",
  "wdt",
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  isThumbnail: boolean("is_thumbnail").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const gearRelations = relations(gear, ({ many }) => ({
  images: many(gearImages),
  recipeGear: many(recipeGear),
}))

export const gearImages = pgTable("gear_images", {
  id: serial("id").primaryKey(),
  gearId: integer("gear_id")
    .references(() => gear.id, { onDelete: "cascade" })
    .notNull(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  isThumbnail: boolean("is_thumbnail").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const gearImagesRelations = relations(gearImages, ({ one }) => ({
  gear: one(gear, {
    fields: [gearImages.gearId],
    references: [gear.id],
  }),
}))

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brewingMethod: brewingMethodEnum("brewing_method").default("espresso").notNull(),
  
  defaultDoseGrams: decimal("default_dose_grams", { precision: 5, scale: 2 }),
  defaultYieldGrams: decimal("default_yield_grams", { precision: 5, scale: 2 }),
  defaultBrewTimeSeconds: integer("default_brew_time_seconds"),
  defaultGrindSetting: text("default_grind_setting"),
  defaultWaterTempCelsius: decimal("default_water_temp_celsius", { precision: 4, scale: 1 }),
  defaultPressure: decimal("default_pressure", { precision: 3, scale: 1 }),
  
  notes: text("notes"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const recipesRelations = relations(recipes, ({ many }) => ({
  gear: many(recipeGear),
  shots: many(shots),
}))

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

export const places = pgTable("places", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const placesRelations = relations(places, ({ many }) => ({
  images: many(placeImages),
  cafeVisits: many(cafeVisits),
}))

export const placeImages = pgTable("place_images", {
  id: serial("id").primaryKey(),
  placeId: integer("place_id")
    .references(() => places.id, { onDelete: "cascade" })
    .notNull(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const placeImagesRelations = relations(placeImages, ({ one }) => ({
  place: one(places, {
    fields: [placeImages.placeId],
    references: [places.id],
  }),
}))

export const shots = pgTable("shots", {
  id: serial("id").primaryKey(),
  beanId: integer("bean_id").references(() => beans.id, { onDelete: "set null" }),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "set null" }),

  doseGrams: decimal("dose_grams", { precision: 5, scale: 2 }),
  yieldGrams: decimal("yield_grams", { precision: 5, scale: 2 }),
  brewTimeSeconds: integer("brew_time_seconds"),
  grindSetting: text("grind_setting"),
  waterTempCelsius: decimal("water_temp_celsius", { precision: 4, scale: 1 }),
  pressure: decimal("pressure", { precision: 3, scale: 1 }),

  rating: integer("rating"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  tasteTags: many(shotTasteTags),
  images: many(shotImages),
}))

export const shotImages = pgTable("shot_images", {
  id: serial("id").primaryKey(),
  shotId: integer("shot_id")
    .references(() => shots.id, { onDelete: "cascade" })
    .notNull(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  placeId: integer("place_id")
    .references(() => places.id, { onDelete: "set null" }),
  beanId: integer("bean_id")
    .references(() => beans.id, { onDelete: "set null" }),
  drinkName: text("drink_name"),
  drinkType: text("drink_type"),
  price: decimal("price", { precision: 6, scale: 2 }),
  currency: text("currency").default("EUR"),
  rating: integer("rating"),
  notes: text("notes"),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const cafeVisitsRelations = relations(cafeVisits, ({ one, many }) => ({
  place: one(places, {
    fields: [cafeVisits.placeId],
    references: [places.id],
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
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
