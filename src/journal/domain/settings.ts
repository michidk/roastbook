import { eq } from 'drizzle-orm'
import { settings as settingsTable } from '@/db/schema'
import {
  currencySchema,
  dateFormatSchema,
  listViewSchema,
  numberFormatSchema,
  timeZoneSchema,
} from '@/journal/input/settings'
import { journalNow } from '@/journal/platform/clock'
import { db, journalInsertValues, owned } from '@/journal/platform/database'
import type { AppSettings } from '@/lib/app-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  DEFAULT_TASTE_PROFILE_FIELDS,
  type TasteProfileConfig,
  tasteProfileConfigFrom,
} from '@/lib/taste-profile'
import { resolveDarkTheme, resolveLightTheme } from '@/lib/theme'

type EditableSettings = Pick<
  typeof settingsTable.$inferInsert,
  | 'beautifyImages'
  | 'backgroundTextureEnabled'
  | 'lightTheme'
  | 'darkTheme'
  | 'backgroundGrainEnabled'
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
    beautifyImages: row.beautifyImages,
    backgroundTextureEnabled: row.backgroundTextureEnabled,
    backgroundGrainEnabled: row.backgroundGrainEnabled,
    lightTheme: resolveLightTheme(row.lightTheme),
    darkTheme: resolveDarkTheme(row.darkTheme),
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
    .values(journalInsertValues({ id: 1 }))
    .onConflictDoNothing({ target: [settingsTable.ownerId, settingsTable.id] })
    .returning()
  if (created) return created

  const existing = await db.query.settings.findFirst({
    where: owned(settingsTable, eq(settingsTable.id, 1)),
  })
  if (!existing) throw new Error('Could not load application settings')
  return existing
}

export async function loadAppSettings(): Promise<AppSettings> {
  return toAppSettings(await ensureSettingsRow())
}

export async function updateSettings(
  patch: Partial<EditableSettings>,
  errorMessage: string,
): Promise<AppSettings> {
  const [row] = await db
    .insert(settingsTable)
    .values(journalInsertValues({ id: 1, ...patch }))
    .onConflictDoUpdate({
      target: [settingsTable.ownerId, settingsTable.id],
      set: { ...patch, updatedAt: journalNow() },
    })
    .returning()
  if (!row) throw new Error(errorMessage)
  return toAppSettings(row)
}

/**
 * Read-only taste profile lookup for server-side domain code that has to honor
 * the configuration without creating the settings row. Falls back to the
 * defaults when no row exists yet.
 */
export async function readTasteProfile(): Promise<TasteProfileConfig> {
  const row = await db.query.settings.findFirst({
    columns: { tasteProfileFields: true },
    where: owned(settingsTable, eq(settingsTable.id, 1)),
  })
  return tasteProfileConfigFrom(
    row?.tasteProfileFields ?? DEFAULT_TASTE_PROFILE_FIELDS,
  )
}
