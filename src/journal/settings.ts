import { z } from 'zod'
import { updateSettings } from '@/journal/domain/settings'
import { journalWrite } from '@/journal/function'
import {
  currencySchema,
  dateFormatSchema,
  defaultMapLocationSchema,
  listViewSchema,
  numberFormatSchema,
  tasteProfileFieldsSchema,
  timeZoneSchema,
} from '@/journal/input/settings'
import type { DefaultMapLocation } from '@/lib/app-settings'
import { DARK_THEMES, LIGHT_THEMES } from '@/lib/theme'

async function saveSettings(
  patch: Parameters<typeof updateSettings>[0],
  errorMessage: string,
) {
  return updateSettings(patch, errorMessage)
}

export const updateDefaultCurrency = journalWrite(
  'settings/updateDefaultCurrency',
)
  .validator(currencySchema)
  .handler(({ data: defaultCurrency }) =>
    saveSettings({ defaultCurrency }, 'Could not save the default currency'),
  )

export const updateBackgroundTextureEnabled = journalWrite(
  'settings/updateBackgroundTextureEnabled',
)
  .validator((value: unknown) => z.boolean().parse(value))
  .handler(({ data: backgroundTextureEnabled }) =>
    saveSettings(
      { backgroundTextureEnabled },
      'Could not save the page background setting',
    ),
  )

export const updateDateFormat = journalWrite('settings/updateDateFormat')
  .validator(dateFormatSchema)
  .handler(({ data: dateFormat }) =>
    saveSettings({ dateFormat }, 'Could not save the date format'),
  )

export const updateNumberFormat = journalWrite('settings/updateNumberFormat')
  .validator(numberFormatSchema)
  .handler(({ data: numberFormat }) =>
    saveSettings({ numberFormat }, 'Could not save the number format'),
  )

export const updateTimeZone = journalWrite('settings/updateTimeZone')
  .validator(timeZoneSchema)
  .handler(({ data: timeZone }) =>
    saveSettings({ timeZone }, 'Could not save the time zone'),
  )

export const updateDefaultListView = journalWrite(
  'settings/updateDefaultListView',
)
  .validator(listViewSchema)
  .handler(({ data: defaultListView }) =>
    saveSettings({ defaultListView }, 'Could not save the default list view'),
  )

export const updateTasteProfileFields = journalWrite(
  'settings/updateTasteProfileFields',
)
  .validator(tasteProfileFieldsSchema)
  .handler(({ data: tasteProfileFields }) =>
    saveSettings(
      { tasteProfileFields },
      'Could not save the taste profile fields',
    ),
  )

export const updateDefaultMapLocation = journalWrite(
  'settings/updateDefaultMapLocation',
)
  .validator((value: unknown): DefaultMapLocation | null =>
    defaultMapLocationSchema.parse(value),
  )
  .handler(({ data: location }) =>
    saveSettings(
      {
        defaultMapLatitude: location?.latitude ?? null,
        defaultMapLongitude: location?.longitude ?? null,
        defaultMapLabel: location?.label ?? null,
      },
      'Could not save the default map location',
    ),
  )

export const updateLightTheme = journalWrite('settings/updateLightTheme')
  .validator(z.enum(LIGHT_THEMES.map((theme) => theme.id)))
  .handler(({ data: lightTheme }) =>
    saveSettings({ lightTheme }, 'Could not save the light theme'),
  )
export const updateDarkTheme = journalWrite('settings/updateDarkTheme')
  .validator(z.enum(DARK_THEMES.map((theme) => theme.id)))
  .handler(({ data: darkTheme }) =>
    saveSettings({ darkTheme }, 'Could not save the dark theme'),
  )
export const updateBackgroundGrainEnabled = journalWrite(
  'settings/updateBackgroundGrainEnabled',
)
  .validator(z.boolean())
  .handler(({ data: backgroundGrainEnabled }) =>
    saveSettings({ backgroundGrainEnabled }, 'Could not save background grain'),
  )
