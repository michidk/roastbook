import * as remote from '@/lib/server/settings'
import { journalWrite } from '../journal-function'
export const updateDefaultCurrency = journalWrite(
  remote.updateDefaultCurrency,
  'settings/updateDefaultCurrency',
)
export const updateBackgroundTextureEnabled = journalWrite(
  remote.updateBackgroundTextureEnabled,
  'settings/updateBackgroundTextureEnabled',
)
export const updateDateFormat = journalWrite(
  remote.updateDateFormat,
  'settings/updateDateFormat',
)
export const updateNumberFormat = journalWrite(
  remote.updateNumberFormat,
  'settings/updateNumberFormat',
)
export const updateTimeZone = journalWrite(
  remote.updateTimeZone,
  'settings/updateTimeZone',
)
export const updateDefaultListView = journalWrite(
  remote.updateDefaultListView,
  'settings/updateDefaultListView',
)
export const updateTasteProfileFields = journalWrite(
  remote.updateTasteProfileFields,
  'settings/updateTasteProfileFields',
)
export const updateDefaultMapLocation = journalWrite(
  remote.updateDefaultMapLocation,
  'settings/updateDefaultMapLocation',
)
export const updateLightTheme = journalWrite(
  remote.updateLightTheme,
  'settings/updateLightTheme',
)
export const updateDarkTheme = journalWrite(
  remote.updateDarkTheme,
  'settings/updateDarkTheme',
)
export const updateBackgroundGrainEnabled = journalWrite(
  remote.updateBackgroundGrainEnabled,
  'settings/updateBackgroundGrainEnabled',
)
