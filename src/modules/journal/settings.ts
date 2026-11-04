import type { JournalRow } from '@roastbook/journal-domain/model'
import { z } from 'zod'
import { tasteProfileConfigFrom } from '@/lib/taste-profile'
import {
  DARK_THEMES,
  LIGHT_THEMES,
  resolveDarkTheme,
  resolveLightTheme,
} from '@/lib/theme'
import { type CommandContext, defineCommand } from './command-context'
import {
  currencySchema,
  dateFormatSchema,
  defaultMapLocationSchema,
  listViewSchema,
  numberFormatSchema,
  tasteProfileFieldsSchema,
  timeZoneSchema,
} from './settings-input'

function patchSettings(
  { tx }: CommandContext,
  patch: Partial<JournalRow<'settings'>>,
) {
  return tx.rows('settings').some((row) => row.id === 1)
    ? tx.update('settings', 1, patch)
    : tx.insert('settings', { id: 1, ...patch })
}
export function localAppSettings(
  row: JournalRow<'settings'>,
  demoMode: boolean,
) {
  const {
    defaultMapLatitude: latitude,
    defaultMapLongitude: longitude,
    defaultMapLabel: label,
  } = row
  return {
    demoMode,
    backgroundTextureEnabled: row.backgroundTextureEnabled,
    backgroundGrainEnabled: row.backgroundGrainEnabled,
    lightTheme: resolveLightTheme(row.lightTheme),
    darkTheme: resolveDarkTheme(row.darkTheme),
    defaultCurrency: currencySchema(row.defaultCurrency),
    dateFormat: dateFormatSchema(row.dateFormat),
    defaultListView: listViewSchema(row.defaultListView),
    numberFormat: numberFormatSchema(row.numberFormat),
    timeZone: timeZoneSchema(row.timeZone),
    defaultMapLocation:
      latitude !== null && longitude !== null && label !== null
        ? { latitude, longitude, label }
        : null,
    tasteProfile: tasteProfileConfigFrom(row.tasteProfileFields),
  }
}
function setting<S extends z.ZodType>(
  schema: S,
  key: keyof JournalRow<'settings'>,
) {
  return defineCommand(schema, (context, value) =>
    patchSettings(context, { [key]: value }),
  )
}
const custom = <T>(parse: (input: unknown) => T) => z.unknown().transform(parse)
export const settingsCommands = {
  'settings/updateDefaultCurrency': setting(
    custom(currencySchema),
    'defaultCurrency',
  ),
  'settings/updateDateFormat': setting(custom(dateFormatSchema), 'dateFormat'),
  'settings/updateNumberFormat': setting(
    custom(numberFormatSchema),
    'numberFormat',
  ),
  'settings/updateTimeZone': setting(custom(timeZoneSchema), 'timeZone'),
  'settings/updateDefaultListView': setting(
    custom(listViewSchema),
    'defaultListView',
  ),
  'settings/updateTasteProfileFields': setting(
    custom(tasteProfileFieldsSchema),
    'tasteProfileFields',
  ),
  'settings/updateBackgroundTextureEnabled': setting(
    z.boolean(),
    'backgroundTextureEnabled',
  ),
  'settings/updateBackgroundGrainEnabled': setting(
    z.boolean(),
    'backgroundGrainEnabled',
  ),
  'settings/updateLightTheme': setting(
    z.enum(LIGHT_THEMES.map((theme) => theme.id)),
    'lightTheme',
  ),
  'settings/updateDarkTheme': setting(
    z.enum(DARK_THEMES.map((theme) => theme.id)),
    'darkTheme',
  ),
  'settings/updateDefaultMapLocation': defineCommand(
    defaultMapLocationSchema,
    (context, value) =>
      patchSettings(context, {
        defaultMapLatitude: value?.latitude ?? null,
        defaultMapLongitude: value?.longitude ?? null,
        defaultMapLabel: value?.label ?? null,
      }),
  ),
}
