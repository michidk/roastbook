import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'

const loadAppSettingsServerOnly = createServerOnlyFn(async () => {
  const { loadAppSettings } = await import('@/lib/server/settings.server')
  const { DEMO_MODE } = await import('@/lib/build-mode')
  const { getJournalContext } = await import('@/db/journal-context.server')
  const identity = DEMO_MODE ? null : getJournalContext()?.identity
  return {
    ...(await loadAppSettings()),
    journalOwner: identity?.id ?? 'local',
    account: identity?.authentication
      ? {
          id: identity.id,
          email: identity.email,
          role: identity.role,
        }
      : null,
  }
})

export const getAppSettings = createServerFn({ method: 'GET' }).handler(
  loadAppSettingsServerOnly,
)
