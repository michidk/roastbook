import '@tanstack/react-start/server-only'
import { eq, sql } from 'drizzle-orm'
import { getAiControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { owned } from '@/db/journal-scope.server'
import { aiRequestLogs, aiWeeklyUsage, authUsers } from '@/db/schema'
import { aiAllowanceWeek } from '@/lib/ai-allowance'
import { providedAiConfig } from './ai-allowance.server'

export async function startAiAccounting(
  values: typeof aiRequestLogs.$inferInsert,
) {
  const identity = requireIdentity()
  return getAiControlDb().transaction(async (tx) => {
    if (values.providerMode === 'provided') await reserveProvidedAiRequest(tx)
    await tx.execute(
      sql`select set_config('roastbook.user_id', ${identity.id}, true)`,
    )
    await tx.execute(sql`set local role roastbook_journal`)
    const [entry] = await tx
      .insert(aiRequestLogs)
      .values({ ...values, ownerId: identity.id })
      .returning({ id: aiRequestLogs.id })
    if (!entry) throw new Error('Could not start AI request accounting')
    return entry.id
  })
}
export async function updateAiAccounting(
  id: number,
  values: Partial<typeof aiRequestLogs.$inferInsert>,
) {
  const identity = requireIdentity()
  await getAiControlDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('roastbook.user_id', ${identity.id}, true)`,
    )
    await tx.execute(sql`set local role roastbook_journal`)
    await tx
      .update(aiRequestLogs)
      .set(values)
      .where(owned(aiRequestLogs, eq(aiRequestLogs.id, id)))
  })
}
// Committed independently of the journal transaction: a failed or cancelled request
// must not roll back the allowance after work has been sent to the provider.
export async function reserveProvidedAiRequest(
  transaction: Parameters<
    Parameters<ReturnType<typeof getAiControlDb>['transaction']>[0]
  >[0],
) {
  const identity = requireIdentity()
  if (!identity.authentication || !providedAiConfig())
    throw new Error('Provided AI is unavailable')
  const [account] = await transaction
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, identity.id))
    .for('share')
  if (!account || account.deletingAt) throw new Error('Account is unavailable')
  const { start } = aiAllowanceWeek()
  if (account.aiWeeklyLimit <= 0)
    throw new Error(
      'Your free AI allowance is exhausted. It resets Monday at 00:00 UTC. You can also use BYOAI in Settings > AI.',
    )
  const [usage] = await transaction
    .insert(aiWeeklyUsage)
    .values({ userId: identity.id, weekStart: start, requests: 1 })
    .onConflictDoUpdate({
      target: [aiWeeklyUsage.userId, aiWeeklyUsage.weekStart],
      set: { requests: sql`${aiWeeklyUsage.requests} + 1` },
      setWhere: sql`${aiWeeklyUsage.requests} < ${account.aiWeeklyLimit}`,
    })
    .returning()
  if (!usage)
    throw new Error(
      'Your free AI allowance is exhausted. It resets Monday at 00:00 UTC. You can also use BYOAI in Settings > AI.',
    )
}
