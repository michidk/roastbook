import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { settings as settingsTable } from '@/db/schema'
import type { AppSettings } from '@/lib/app-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  currencySchema,
  dateFormatSchema,
  listViewSchema,
  numberFormatSchema,
  timeZoneSchema,
} from '@/lib/server/settings-contract'
import {
  DEFAULT_TASTE_PROFILE_FIELDS,
  type TasteProfileConfig,
  tasteProfileConfigFrom,
} from '@/lib/taste-profile'

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

let cachedSettings: AppSettings | undefined

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

export async function loadAppSettings(): Promise<AppSettings> {
  if (cachedSettings) return cachedSettings
  cachedSettings = toAppSettings(await ensureSettingsRow())
  return cachedSettings
}

export async function updateSettings(
  patch: Partial<EditableSettings>,
  errorMessage: string,
): Promise<AppSettings> {
  const [row] = await db
    .insert(settingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning()
  if (!row) throw new Error(errorMessage)
  cachedSettings = toAppSettings(row)
  return cachedSettings
}

/**
 * Read-only taste profile lookup for server-side domain code that has to honor
 * the configuration without creating the settings row. Falls back to the
 * defaults when no row exists yet.
 */
export async function readTasteProfile(): Promise<TasteProfileConfig> {
  if (cachedSettings) return cachedSettings.tasteProfile
  const row = await db.query.settings.findFirst({
    columns: { tasteProfileFields: true },
    where: eq(settingsTable.id, 1),
  })
  return tasteProfileConfigFrom(
    row?.tasteProfileFields ?? DEFAULT_TASTE_PROFILE_FIELDS,
  )
}
