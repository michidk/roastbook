import postgres from 'postgres'
import { getServerEnv } from '@/lib/env.server'
import { toDisplayableError } from '@/lib/error-display'

export async function toDisplayableDatabaseError(
  error: unknown,
): Promise<Error> {
  const normalizedError = toDisplayableError(error)

  if (
    normalizedError.message !== (error instanceof Error ? error.message : '')
  ) {
    return normalizedError
  }

  let connectionString: string
  try {
    connectionString = getServerEnv().DATABASE_URL
  } catch (configurationError) {
    return toDisplayableError(configurationError)
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 2,
  })

  try {
    await sql.unsafe('select 1')
  } catch (connectionError) {
    await sql.end({ timeout: 1 }).catch(() => {})
    return toDisplayableError(connectionError)
  }

  try {
    const result = await sql.unsafe<{ table_name: string | null }[]>(
      "select to_regclass('public.shots') as table_name",
    )

    if (!result[0]?.table_name) {
      return toDisplayableError(new Error('relation "brews" does not exist'))
    }
  } catch {
    // Ignore diagnostics failures here and fall back to the original error below.
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {})
  }

  return normalizedError
}
