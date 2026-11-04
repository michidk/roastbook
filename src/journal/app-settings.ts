import { loadAppSettings } from '@/journal/domain/settings'
import { journalRead } from '@/journal/function'
import { journalIdentity } from '@/journal/platform/database'

export const getAppSettings = journalRead(
  'app-settings/getAppSettings',
).handler(async () => {
  const identity = journalIdentity()
  return {
    ...(await loadAppSettings()),
    journalOwner: identity?.id ?? 'local',
    account: identity?.authentication
      ? { id: identity.id, email: identity.email, role: identity.role }
      : null,
  }
})
