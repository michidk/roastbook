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
  isTimeZone,
  type NumberFormat,
} from '@/lib/app-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { type CollectionView, isCollectionView } from '@/lib/collection-view'
import {
  DEFAULT_TASTE_PROFILE_FIELDS,
  TASTE_PROFILE_FIELDS,
  type TasteProfileConfig,
  type TasteProfileField,
  tasteProfileConfigFrom,
} from '@/lib/taste-profile'

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

function timeZoneSchema(value: unknown): string {
  if (!isTimeZone(value)) throw new Error('Enter a valid IANA time zone')
  return value
}

function listViewSchema(value: unknown): CollectionView {
  if (!isCollectionView(value)) throw new Error('Choose a supported list view')
  return value
}

// Normalizes to the canonical field order and silently drops anything the
// current build does not know about, so a stored value from another version
// never breaks the settings page.
function tasteProfileFieldsSchema(value: unknown): TasteProfileField[] {
  const fields = z.array(z.string()).max(64).parse(value)
  return TASTE_PROFILE_FIELDS.filter((field) => fields.includes(field))
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
    demoMode: DEMO_MODE,
    backgroundTextureEnabled: row.backgroundTextureEnabled,
    defaultCurrency: currencySchema(row.defaultCurrency),
    dateFormat: dateFormatSchema(row.dateFormat),
    defaultListView: listViewSchema(row.defaultListView),
    defaultMapLocation,
    numberFormat: numberFormatSchema(row.numberFormat),
    tasteProfile: tasteProfileConfigFrom(row.tasteProfileFields),
    timeZone: timeZoneSchema(row.timeZone),
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

type EditableSettings = Pick<
  typeof settingsTable.$inferInsert,
  | 'backgroundTextureEnabled'
  | 'defaultCurrency'
  | 'dateFormat'
  | 'defaultListView'
  | 'numberFormat'
  | 'tasteProfileFields'
  | 'timeZone'
  | 'defaultMapLatitude'
  | 'defaultMapLongitude'
  | 'defaultMapLabel'
>

async function upsertSettings(
  patch: Partial<EditableSettings>,
  errorMessage: string,
) {
  const [row] = await db
    .insert(settingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning()
  if (!row) throw new Error(errorMessage)
  return toAppSettings(row)
}

export const getAppSettings = createServerFn({ method: 'GET' }).handler(
  async () => toAppSettings(await ensureSettingsRow()),
)

/**
 * Read-only taste profile lookup for server-side domain code that has to honor
 * the configuration without creating the settings row. Falls back to the
 * defaults when no row exists yet.
 */
export async function readTasteProfile(): Promise<TasteProfileConfig> {
  const row = await db.query.settings.findFirst({
    columns: { tasteProfileFields: true },
    where: eq(settingsTable.id, 1),
  })
  return tasteProfileConfigFrom(
    row?.tasteProfileFields ?? DEFAULT_TASTE_PROFILE_FIELDS,
  )
}

export const updateDefaultCurrency = createServerFn({ method: 'POST' })
  .validator(currencySchema)
  .handler(({ data: defaultCurrency }) =>
    upsertSettings({ defaultCurrency }, 'Could not save the default currency'),
  )

export const updateBackgroundTextureEnabled = createServerFn({
  method: 'POST',
})
  .validator((value: unknown) => z.boolean().parse(value))
  .handler(({ data: backgroundTextureEnabled }) =>
    upsertSettings(
      { backgroundTextureEnabled },
      'Could not save the page background setting',
    ),
  )

export const updateDateFormat = createServerFn({ method: 'POST' })
  .validator(dateFormatSchema)
  .handler(({ data: dateFormat }) =>
    upsertSettings({ dateFormat }, 'Could not save the date format'),
  )

export const updateNumberFormat = createServerFn({ method: 'POST' })
  .validator(numberFormatSchema)
  .handler(({ data: numberFormat }) =>
    upsertSettings({ numberFormat }, 'Could not save the number format'),
  )

export const updateTimeZone = createServerFn({ method: 'POST' })
  .validator(timeZoneSchema)
  .handler(({ data: timeZone }) =>
    upsertSettings({ timeZone }, 'Could not save the time zone'),
  )

export const updateDefaultListView = createServerFn({ method: 'POST' })
  .validator(listViewSchema)
  .handler(({ data: defaultListView }) =>
    upsertSettings({ defaultListView }, 'Could not save the default list view'),
  )

export const updateTasteProfileFields = createServerFn({ method: 'POST' })
  .validator(tasteProfileFieldsSchema)
  .handler(({ data: tasteProfileFields }) =>
    upsertSettings(
      { tasteProfileFields },
      'Could not save the taste profile fields',
    ),
  )

export const updateDefaultMapLocation = createServerFn({ method: 'POST' })
  .validator((value: unknown): DefaultMapLocation | null =>
    defaultMapLocationSchema.parse(value),
  )
  .handler(({ data: location }) =>
    upsertSettings(
      {
        defaultMapLatitude: location?.latitude ?? null,
        defaultMapLongitude: location?.longitude ?? null,
        defaultMapLabel: location?.label ?? null,
      },
      'Could not save the default map location',
    ),
  )
