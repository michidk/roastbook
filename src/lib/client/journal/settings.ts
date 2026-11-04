import * as remote from '@/lib/server/settings'
import { journalFunction } from '../journal-function'
export const updateDefaultCurrency = journalFunction(
  remote.updateDefaultCurrency,
  'settings/updateDefaultCurrency',
  true,
)
export const updateBackgroundTextureEnabled = journalFunction(
  remote.updateBackgroundTextureEnabled,
  'settings/updateBackgroundTextureEnabled',
  true,
)
export const updateDateFormat = journalFunction(
  remote.updateDateFormat,
  'settings/updateDateFormat',
  true,
)
export const updateNumberFormat = journalFunction(
  remote.updateNumberFormat,
  'settings/updateNumberFormat',
  true,
)
export const updateTimeZone = journalFunction(
  remote.updateTimeZone,
  'settings/updateTimeZone',
  true,
)
export const updateDefaultListView = journalFunction(
  remote.updateDefaultListView,
  'settings/updateDefaultListView',
  true,
)
export const updateTasteProfileFields = journalFunction(
  remote.updateTasteProfileFields,
  'settings/updateTasteProfileFields',
  true,
)
export const updateDefaultMapLocation = journalFunction(
  remote.updateDefaultMapLocation,
  'settings/updateDefaultMapLocation',
  true,
)
export const updateLightTheme = journalFunction(
  remote.updateLightTheme,
  'settings/updateLightTheme',
  true,
)
export const updateDarkTheme = journalFunction(
  remote.updateDarkTheme,
  'settings/updateDarkTheme',
  true,
)
export const updateBackgroundGrainEnabled = journalFunction(
  remote.updateBackgroundGrainEnabled,
  'settings/updateBackgroundGrainEnabled',
  true,
)
