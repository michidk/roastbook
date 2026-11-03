import '@tanstack/react-start/server-only'
import { DEMO_MODE_READ_ONLY_MESSAGE } from '@/lib/build-mode'

export function isDemoModeWriteRequest(
  demoMode: boolean,
  method: string,
): boolean {
  return demoMode && method !== 'GET' && method !== 'HEAD'
}

export function demoModeReadOnlyResponse(): Response {
  // Plain text: the server-fn client returns JSON bodies as data but throws non-OK text as an Error.
  return new Response(DEMO_MODE_READ_ONLY_MESSAGE, {
    status: 403,
    statusText: 'Forbidden',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export function isDemoServerRequestBlocked(
  demoMode: boolean,
  method: string,
  pathname: string,
): boolean {
  return (
    isDemoModeWriteRequest(demoMode, method) ||
    (demoMode &&
      ((pathname.startsWith('/api/') && pathname !== '/api/health') ||
        pathname.startsWith('/_serverFn/')))
  )
}
