import '@tanstack/react-start/server-only'
import {
  demoModeReadOnlyResponse,
  isDemoServerRequestBlocked,
} from '@/lib/server/demo-mode.server'

export async function handleJournalRequest(
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  return isDemoServerRequestBlocked(
    true,
    request.method,
    new URL(request.url).pathname,
  )
    ? demoModeReadOnlyResponse()
    : next()
}
