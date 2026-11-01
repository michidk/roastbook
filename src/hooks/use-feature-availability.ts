import { useOnlineStatus } from '@/hooks/use-online-status'
import { type AppFeature, featureAvailability } from '@/lib/app-capabilities'

export function useFeatureAvailability(feature: AppFeature, configured = true) {
  return featureAvailability(feature, { online: useOnlineStatus(), configured })
}
