import '@tanstack/react-start/server-only'

// The demo has no accounts, so requests need no journal identity. The demo
// middleware in src/start.ts already rejects server endpoints.
export async function handleJournalRequest(
  _request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  return next()
}
