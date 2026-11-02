import '@tanstack/react-start/server-only'
import { eq, sql } from 'drizzle-orm'
import { SQLiteAsyncDialect } from 'drizzle-orm/sqlite-core'
import { getControlDb } from '@/db/connection.server'
import type { JournalIdentity } from '@/db/journal-context.server'
import { authUsers } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { requireCloudflareRuntime } from '../context.server'
import { journalDefaultStatements } from './defaults.server'

export async function initializeUser(user: {
  id: string
  email: string
  emailVerified: boolean
}) {
  if (!user.emailVerified) throw new Error('Email verification is required')
  const [current] = await getControlDb()
    .select({ initialized: authUsers.journalInitializedAt })
    .from(authUsers)
    .where(eq(authUsers.id, user.id))
  if (current?.initialized) return
  const environment = getServerEnv()
  const dialect = new SQLiteAsyncDialect()
  const assertionId = crypto.randomUUID()
  const statements = [
    sql`insert into journal_mutation_assertions(id,expected_changes,actual_changes) values (${assertionId},1,(select count(*) from auth_users where id=${user.id} and email_verified=1 and deleting_at is null and (journal_initialized_at is not null or ${environment.AUTH_SIGNUP_ENABLED ? 1 : 0}=1 or email=${environment.AUTH_ADMIN_EMAIL ?? ''})))`,
    sql`delete from journal_mutation_assertions where id=${assertionId}`,
    ...(await journalDefaultStatements(user.id)),
    sql`update auth_users set journal_initialized_at=${Date.now()},role=case when email=${environment.AUTH_ADMIN_EMAIL ?? ''} then 'admin' else role end where id=${user.id} and journal_initialized_at is null`,
  ]
  const database = requireCloudflareRuntime().bindings.DB
  await database.batch(
    statements.map((statement) => {
      const query = dialect.sqlToQuery(statement)
      return database.prepare(query.sql).bind(...query.params)
    }),
  )
}

export async function defaultIdentity(): Promise<JournalIdentity> {
  throw new Error('Hosted journals require authentication')
}
