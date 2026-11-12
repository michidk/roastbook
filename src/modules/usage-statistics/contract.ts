import { z } from 'zod'

export const browserUsageEventSchema = z.enum([
  'pwa_install_prompt_opened',
  'pwa_install_prompt_accepted',
  'pwa_install_prompt_dismissed',
  'pwa_installed',
  'pwa_install_hint_dismissed',
])

export const usageEventSchema = z.enum([
  ...browserUsageEventSchema.options,
  'ai_key_saved',
  'integration_credential_created',
  'integration_credential_updated',
  'integration_credential_revoked',
  'account_deletion_requested',
  'account_deletion_confirmed',
  'account_export_requested',
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
