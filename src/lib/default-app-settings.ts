import type { AppSettings } from '@/lib/app-settings'
import { DEFAULT_TASTE_PROFILE_CONFIG } from '@/lib/taste-profile'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  demoMode: false,
  backgroundTextureEnabled: true,
  defaultCurrency: 'EUR',
  dateFormat: 'day-month-year-slash',
  defaultListView: 'cards',
  defaultMapLocation: null,
  numberFormat: 'decimal-point',
  tasteProfile: DEFAULT_TASTE_PROFILE_CONFIG,
  timeZone: 'UTC',
}
