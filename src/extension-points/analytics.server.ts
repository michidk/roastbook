import '@tanstack/react-start/server-only'
import { recordUsageEvent } from '@/lib/server/usage-statistics.server'

export type AnalyticsEvent =
  | 'bean_created'
  | 'brew_created'
  | 'ai_recommendation_created'
  | 'ai_key_saved'
  | 'integration_credential_created'
  | 'integration_credential_updated'
  | 'integration_credential_revoked'
  | 'account_deletion_requested'
  | 'account_deletion_confirmed'
  | 'account_export_requested'

export function trackEvent(event: AnalyticsEvent) {
  void recordUsageEvent(event)
}
