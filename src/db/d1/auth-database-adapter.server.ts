import '@tanstack/react-start/server-only'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { authDatabaseSchema } from '@/lib/server/auth/database-schema.server'
import { getControlDb } from './connection.server'

export function createAuthDatabaseAdapter() {
  // Better Auth 1.7.15 uses atomic DELETE ... RETURNING for consumeOne on
  // SQLite. Interactive Drizzle transactions are unsupported by D1.
  return drizzleAdapter(getControlDb(), {
    provider: 'sqlite',
    transaction: false,
    schema: authDatabaseSchema,
  })
}
