import '@tanstack/react-start/server-only'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getControlDb } from '@/db/connection.server'
import { authDatabaseSchema } from './database-schema.server'

export function createAuthDatabaseAdapter() {
  return drizzleAdapter(getControlDb(), {
    provider: 'pg',
    transaction: true,
    schema: authDatabaseSchema,
  })
}
