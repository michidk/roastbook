import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'

const loadAppSettingsServerOnly = createServerOnlyFn(async () => {
  const { loadAppSettings } = await import('@/lib/server/settings.server')
  return loadAppSettings()
})

export const getAppSettings = createServerFn({ method: 'GET' }).handler(
  loadAppSettingsServerOnly,
)
