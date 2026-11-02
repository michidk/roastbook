import { lt } from 'drizzle-orm'
import { db } from '@/db'
import type { JournalMutation } from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { clientOperations } from '@/db/schema'

export const CLIENT_OPERATION_RETENTION_DAYS = 90

export function clientOperationMutations(
  value: { operationId?: string; brewId?: number; recipeId?: number },
  now = new Date(),
): JournalMutation[] {
  if (!value.operationId) return []
  const cutoff = new Date(
    now.getTime() - CLIENT_OPERATION_RETENTION_DAYS * 86400_000,
  )
  return [
    {
      statement: db
        .insert(clientOperations)
        .values(
          journalInsertValues({
            operationId: value.operationId,
            brewId: value.brewId,
            recipeId: value.recipeId,
          }),
        )
        .getSQL(),
      expectedChanges: 1,
    },
    {
      statement: db
        .delete(clientOperations)
        .where(owned(clientOperations, lt(clientOperations.createdAt, cutoff)))
        .getSQL(),
    },
  ]
}
