import '@tanstack/react-start/server-only'

export type AnalyticsEvent =
  | 'bean_created'
  | 'brew_created'
  | 'ai_recommendation_created'

// Default: self-hosted instances record no product analytics.
export function trackEvent(_event: AnalyticsEvent) {}
