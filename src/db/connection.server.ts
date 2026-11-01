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
