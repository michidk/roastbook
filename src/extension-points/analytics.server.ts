import '@tanstack/react-start/server-only'
import { recordUsageEvent } from '@/lib/server/usage-statistics.server'
import type { ServerUsageEvent } from '@/modules/usage-statistics/contract'

export type AnalyticsEvent = ServerUsageEvent

export function trackEvent(event: AnalyticsEvent) {
  void recordUsageEvent(event)
}
