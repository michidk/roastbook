import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { requireIdentity } from '@/db/journal-context.server'
import { assertControlCondition, runControlBatch } from './control-batch.server'

export async function createIntegrationToken(
  kind: 'mcp' | 'shottimer',
  name: string,
) {
  const identity = requireIdentity()
  if (
    !identity.authentication ||
    !identity.authenticatedAt ||
    Date.now() - identity.authenticatedAt.getTime() > 600_000
  )
    throw new Error('Sign in again before creating credentials')
  const token = randomBytes(32).toString('base64url')
  const statements = [
    ...assertControlCondition(
      sql`exists(select 1 from auth_users where id=${identity.id} and deleting_at is null) and (select count(*) from integration_tokens where user_id=${identity.id}) < 10`,
    ),
  ]
  if (kind === 'shottimer')
    statements.push(
      sql`delete from integration_tokens where user_id=${identity.id} and kind=${kind}`,
    )
  statements.push(
    sql`insert into integration_tokens(id,user_id,kind,name,token_hash,expires_at) values (${randomUUID()},${identity.id},${kind},${name},${createHash('sha256').update(token).digest('hex')},${Date.now() + 365 * 86400_000})`,
  )
  await runControlBatch(
    statements,
    'Account unavailable or credential limit reached',
  )
  return token
}
