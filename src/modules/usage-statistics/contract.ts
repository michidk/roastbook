import { z } from 'zod'

export const usageEventSchema = z.enum([
  'bean_created',
  'brew_created',
  'ai_recommendation_created',
])
export const USAGE_CONSENT_COOKIE = 'roastbook_usage_v1'

export function parseUsageConsent(value: string | undefined) {
  if (value === 'denied') return { preference: 'denied', id: null } as const
  const id = z.uuid().safeParse(value)
  return id.success
    ? ({ preference: 'granted', id: id.data } as const)
    : ({ preference: 'pending', id: null } as const)
}
