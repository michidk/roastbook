import '@tanstack/react-start/server-only'

export const DEMO_MODE_READ_ONLY_MESSAGE =
  'Demo mode is read-only. Changes are disabled.'

export function isDemoModeWriteRequest(
  demoMode: boolean,
  method: string,
): boolean {
  return demoMode && method !== 'GET' && method !== 'HEAD'
}

export function demoModeReadOnlyResponse(): Response {
  return Response.json(
    { error: DEMO_MODE_READ_ONLY_MESSAGE },
    { status: 403, statusText: 'Forbidden' },
  )
}
