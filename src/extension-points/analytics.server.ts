import '@tanstack/react-start/server-only'
import { recordUsageEvent } from '@/lib/server/usage-statistics.server'

export type AnalyticsEvent =
  | 'bean_created'
  | 'brew_created'
  | 'ai_recommendation_created'
  | 'ai_key_saved'

export function trackEvent(event: AnalyticsEvent) {
  void recordUsageEvent(event)
}
