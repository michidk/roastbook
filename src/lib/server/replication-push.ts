import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '@/db'
import {
  allocateJournalIds,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { recipes } from '@/db/schema'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'
import {
  isAlreadyAppliedRecipe,
  pushBodySchema,
  type pushRowSchema,
  recipeReplicationDeletionMutation,
  recipeReplicationMutation,
  toDocument,
} from './replication-shared'

export async function pushRecipes(
  input: unknown,
): Promise<RecipeReplicationDocument[]> {
  const { rows } = pushBodySchema.parse(input)
  const conflicts: RecipeReplicationDocument[] = []
  // Each document and its change record commit atomically. Documents are
  // independent, and retries recognize a previously applied revision.
  for (const row of rows) {
    const conflict = await pushRecipe(row)
    if (conflict) conflicts.push(conflict)
  }
  return conflicts
}

async function pushRecipe(
  row: z.infer<typeof pushRowSchema>,
): Promise<RecipeReplicationDocument | undefined> {
  const incoming = row.newDocumentState
  const findCurrent = () =>
    db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.syncId, incoming.syncId)),
    })
  const existing = await findCurrent()
  if (incoming._deleted) {
    if (!existing) return
    if (
      !row.assumedMasterState ||
      existing.revision !== row.assumedMasterState.serverRevision
    )
      return toDocument(existing)
    try {
      await runJournalMutations([
        {
          statement: db
            .delete(recipes)
            .where(
              owned(
                recipes,
                and(
                  eq(recipes.id, existing.id),
                  eq(recipes.revision, existing.revision),
                ),
              ),
            )
            .getSQL(),
          expectedChanges: 1,
        },
        recipeReplicationDeletionMutation(existing.syncId),
      ])
    } catch (error) {
      const current = await findCurrent()
      if (current) return toDocument(current)
      if (!current) return
      throw error
    }
    return
  }
  if (
    existing &&
    isAlreadyAppliedRecipe(incoming, existing, row.assumedMasterState)
  )
    return
  if (
    existing &&
    (!row.assumedMasterState ||
      existing.revision !== row.assumedMasterState.serverRevision)
  )
    return toDocument(existing)
  const [id] = existing ? [existing.id] : await allocateJournalIds(recipes)
  if (id === undefined) throw new Error('Could not allocate recipe identifier')
  const values = {
    name: incoming.name,
    brewingMethodId: incoming.brewingMethodId,
    beanId: incoming.beanId ?? null,
    drinkTypeId: incoming.drinkTypeId ?? null,
    revision: existing ? existing.revision + 1 : 0,
    updatedAt: new Date(),
  }
  try {
    await runJournalMutations([
      {
        statement: existing
          ? db
              .update(recipes)
              .set(values)
              .where(
                owned(
                  recipes,
                  and(
                    eq(recipes.id, id),
                    eq(recipes.revision, existing.revision),
                  ),
                ),
              )
              .getSQL()
          : db
              .insert(recipes)
              .values(
                journalInsertValues({ ...values, id, syncId: incoming.syncId }),
              )
              .getSQL(),
        expectedChanges: 1,
      },
      recipeReplicationMutation({ ...values, id, syncId: incoming.syncId }),
    ])
  } catch (error) {
    const current = await findCurrent()
    if (current)
      return isAlreadyAppliedRecipe(incoming, current, row.assumedMasterState)
        ? undefined
        : toDocument(current)
    throw error
  }
}
