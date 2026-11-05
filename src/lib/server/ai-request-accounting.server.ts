import '@tanstack/react-start/server-only'
import { eq, sql } from 'drizzle-orm'
import { getAiControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { owned } from '@/db/journal-scope.server'
import { aiRequestLogs } from '@/db/schema'

export async function startAiAccounting(
  values: typeof aiRequestLogs.$inferInsert,
) {
  const identity = requireIdentity()
  return getAiControlDb().transaction(async (tx) => {
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
