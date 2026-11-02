import '@tanstack/react-start/server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getServerEnv } from '@/lib/env.server'
import * as schema from './schema'

let connection: ReturnType<typeof connect> | undefined
function connect() {
  const client = postgres(getServerEnv().DATABASE_URL)
  return drizzle(client, { schema })
}

export function getControlDb() {
  connection ??= connect()
  return connection
}

// Advisory locks stay on a separate pool so exchanges can always use the
// authentication adapter while holding a lock, even under concurrent load.
let oauthLockConnection: ReturnType<typeof connect> | undefined
export function getOAuthLockDb() {
  oauthLockConnection ??= drizzle(
    postgres(getServerEnv().DATABASE_URL, { max: 4 }),
    { schema },
  )
  return oauthLockConnection
}

// AI accounting commits independently while a journal request holds its own
// connection. A separate pool prevents request bursts exhausting both sides.
let aiControlConnection: ReturnType<typeof connect> | undefined
export function getAiControlDb() {
  aiControlConnection ??= drizzle(
    postgres(getServerEnv().DATABASE_URL, { max: 4 }),
    { schema },
  )
  return aiControlConnection
}

// Authentication stays available when journal work reaches its own pool limit.
let journalConnection: ReturnType<typeof connect> | undefined
export function getJournalDb() {
  journalConnection ??= drizzle(
    postgres(getServerEnv().DATABASE_URL, {
      max: 8,
      connect_timeout: 5,
      connection: { statement_timeout: 30_000, lock_timeout: 5_000 },
    }),
    { schema },
  )
  return journalConnection
}
