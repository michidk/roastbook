// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).
import {
  peekRecordedValue,
  takeRecordedValues,
} from '@/db/journal-replay.server'

// A browser clock ahead of the server's by more than this is not trusted.
const maxSkewMs = 5 * 60_000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The time of the current write; a replay uses the time the browser made it. */
export function journalNow(): Date {
  const recorded = peekRecordedValue('now')
  if (recorded === undefined) return new Date()
  const time = typeof recorded === 'string' ? Date.parse(recorded) : Number.NaN
  if (!Number.isFinite(time) || time > Date.now() + maxSkewMs)
    throw new Error('Invalid replayed time')
  return new Date(time)
}

/** A generated identifier; a replay uses the one the browser generated. */
export function journalUuid(): string {
  const [recorded] = takeRecordedValues('uuid', 1) ?? []
  if (recorded === undefined) return crypto.randomUUID()
  if (typeof recorded !== 'string' || !uuid.test(recorded))
    throw new Error('Invalid replayed identifier')
  return recorded
}
