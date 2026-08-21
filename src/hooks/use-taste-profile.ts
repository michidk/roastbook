import { useAppSettings } from '@/hooks/use-app-settings'
import type { TasteProfileConfig } from '@/lib/taste-profile'

/** Which tasting inputs this installation captures and renders. */
export function useTasteProfile(): TasteProfileConfig {
  return useAppSettings().tasteProfile
}
