import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { DefaultMapLocation } from '@/lib/app-settings'
import { updateSettings } from '@/lib/server/settings.server'
import {
  currencySchema,
  dateFormatSchema,
  defaultMapLocationSchema,
  listViewSchema,
  numberFormatSchema,
  tasteProfileFieldsSchema,
  timeZoneSchema,
} from '@/lib/server/settings-contract'

async function saveSettings(
  patch: Parameters<typeof updateSettings>[0],
  errorMessage: string,
) {
  return updateSettings(patch, errorMessage)
}

export const updateDefaultCurrency = createServerFn({ method: 'POST' })
  .validator(currencySchema)
  .handler(({ data: defaultCurrency }) =>
    saveSettings({ defaultCurrency }, 'Could not save the default currency'),
  )

export const updateBackgroundTextureEnabled = createServerFn({
  method: 'POST',
})
  .validator((value: unknown) => z.boolean().parse(value))
  .handler(({ data: backgroundTextureEnabled }) =>
    saveSettings(
      { backgroundTextureEnabled },
      'Could not save the page background setting',
    ),
  )

export const updateDateFormat = createServerFn({ method: 'POST' })
  .validator(dateFormatSchema)
  .handler(({ data: dateFormat }) =>
    saveSettings({ dateFormat }, 'Could not save the date format'),
  )

export const updateNumberFormat = createServerFn({ method: 'POST' })
  .validator(numberFormatSchema)
  .handler(({ data: numberFormat }) =>
    saveSettings({ numberFormat }, 'Could not save the number format'),
  )

export const updateTimeZone = createServerFn({ method: 'POST' })
  .validator(timeZoneSchema)
  .handler(({ data: timeZone }) =>
    saveSettings({ timeZone }, 'Could not save the time zone'),
  )

export const updateDefaultListView = createServerFn({ method: 'POST' })
  .validator(listViewSchema)
  .handler(({ data: defaultListView }) =>
    saveSettings({ defaultListView }, 'Could not save the default list view'),
  )

export const updateTasteProfileFields = createServerFn({ method: 'POST' })
  .validator(tasteProfileFieldsSchema)
  .handler(({ data: tasteProfileFields }) =>
    saveSettings(
      { tasteProfileFields },
      'Could not save the taste profile fields',
    ),
  )

export const updateDefaultMapLocation = createServerFn({ method: 'POST' })
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
