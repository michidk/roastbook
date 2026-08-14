import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { settings as settingsTable } from '@/db/schema'
import {
  type AppSettings,
  type Currency,
  type DateFormat,
  type DefaultMapLocation,
  isCurrency,
  isDateFormat,
  isNumberFormat,
  type NumberFormat,
} from '@/lib/app-settings'
import { type CollectionView, isCollectionView } from '@/lib/collection-view'

const defaultMapLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    label: z.string().trim().min(1).max(500),
  })
  .nullable()

function currencySchema(value: unknown): Currency {
  if (!isCurrency(value)) throw new Error('Choose a supported currency')
  return value
}

function dateFormatSchema(value: unknown): DateFormat {
  if (!isDateFormat(value)) throw new Error('Choose a supported date format')
  return value
}

function numberFormatSchema(value: unknown): NumberFormat {
  if (!isNumberFormat(value))
    throw new Error('Choose a supported number format')
  return value
}

function listViewSchema(value: unknown): CollectionView {
  if (!isCollectionView(value)) throw new Error('Choose a supported list view')
  return value
}

function toAppSettings(row: typeof settingsTable.$inferSelect): AppSettings {
  const latitude = row.defaultMapLatitude
  const longitude = row.defaultMapLongitude
  const label = row.defaultMapLabel
  const defaultMapLocation =
    latitude !== null && longitude !== null && label !== null
      ? { latitude, longitude, label }
      : null

  return {
    defaultCurrency: currencySchema(row.defaultCurrency),
    dateFormat: dateFormatSchema(row.dateFormat),
    defaultListView: listViewSchema(row.defaultListView),
    defaultMapLocation,
    numberFormat: numberFormatSchema(row.numberFormat),
  }
}

async function ensureSettingsRow() {
  const [created] = await db
    .insert(settingsTable)
    .values({ id: 1 })
    .onConflictDoNothing({ target: settingsTable.id })
    .returning()
  if (created) return created

  const existing = await db.query.settings.findFirst({
    where: eq(settingsTable.id, 1),
  })
  if (!existing) throw new Error('Could not load application settings')
  return existing
}

export const getAppSettings = createServerFn({ method: 'GET' }).handler(
  async () => toAppSettings(await ensureSettingsRow()),
)

export const updateDefaultCurrency = createServerFn({ method: 'POST' })
  .validator(currencySchema)
  .handler(async ({ data: defaultCurrency }) => {
    const [row] = await db
      .insert(settingsTable)
      .values({ id: 1, defaultCurrency })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { defaultCurrency, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error('Could not save the default currency')
    return toAppSettings(row)
  })

export const updateDateFormat = createServerFn({ method: 'POST' })
  .validator(dateFormatSchema)
  .handler(async ({ data: dateFormat }) => {
    const [row] = await db
      .insert(settingsTable)
      .values({ id: 1, dateFormat })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { dateFormat, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error('Could not save the date format')
    return toAppSettings(row)
  })

export const updateNumberFormat = createServerFn({ method: 'POST' })
  .validator(numberFormatSchema)
  .handler(async ({ data: numberFormat }) => {
    const [row] = await db
      .insert(settingsTable)
      .values({ id: 1, numberFormat })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { numberFormat, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error('Could not save the number format')
    return toAppSettings(row)
  })

export const updateDefaultListView = createServerFn({ method: 'POST' })
  .validator(listViewSchema)
  .handler(async ({ data: defaultListView }) => {
    const [row] = await db
      .insert(settingsTable)
      .values({ id: 1, defaultListView })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { defaultListView, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error('Could not save the default list view')
    return toAppSettings(row)
  })

export const updateDefaultMapLocation = createServerFn({ method: 'POST' })
  .validator((value: unknown): DefaultMapLocation | null =>
    defaultMapLocationSchema.parse(value),
  )
  .handler(async ({ data: location }) => {
    const [row] = await db
      .insert(settingsTable)
      .values({
        id: 1,
        defaultMapLatitude: location?.latitude ?? null,
        defaultMapLongitude: location?.longitude ?? null,
        defaultMapLabel: location?.label ?? null,
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          defaultMapLatitude: location?.latitude ?? null,
          defaultMapLongitude: location?.longitude ?? null,
          defaultMapLabel: location?.label ?? null,
          updatedAt: new Date(),
        },
      })
      .returning()
    if (!row) throw new Error('Could not save the default map location')
    return toAppSettings(row)
  })
