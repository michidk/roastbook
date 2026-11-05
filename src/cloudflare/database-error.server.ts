import '@tanstack/react-start/server-only'

export async function toDisplayableDatabaseError(
  _error: unknown,
): Promise<Error> {
  return new Error('Could not load journal data. Try again.')
}
