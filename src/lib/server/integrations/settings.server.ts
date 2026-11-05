import '@tanstack/react-start/server-only'
import { requireIdentity } from '@/db/journal-context.server'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  type CredentialKind,
  listIntegrationCredentials,
} from '../auth/integrations.server'
import { loadIntegrationUsage } from './rate-limit.server'

/** Keys of one kind with today's use, and the account's shared allowance. */
export async function loadIntegrationSettings(
  kind: CredentialKind,
  otherCredentialIds: readonly string[] = [],
) {
  if (DEMO_MODE)
    return {
      credentials: [],
      rateLimit: null,
      requestsToday: {} as Record<string, number>,
    }
  const credentials = await listIntegrationCredentials(kind)
  const usage = await loadIntegrationUsage(requireIdentity().id, [
    ...credentials.map((credential) => credential.id),
    ...otherCredentialIds,
  ])
  return {
    credentials: credentials.map((credential) => ({
      ...credential,
      requestsToday: usage.requestsToday[credential.id] ?? 0,
    })),
    rateLimit: usage.account,
    requestsToday: usage.requestsToday,
  }
}
