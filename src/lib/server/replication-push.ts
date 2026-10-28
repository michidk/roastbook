import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '@/db'
import { recipes } from '@/db/schema'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'
import {
  isAlreadyAppliedRecipe,
  pushBodySchema,
  type pushRowSchema,
  type ReplicationTransaction,
  recordRecipeReplicationChange,
  recordRecipeReplicationDeletion,
  toDocument,
} from './replication-shared'

export async function pushRecipes(
  input: unknown,
): Promise<RecipeReplicationDocument[]> {
  const { rows } = pushBodySchema.parse(input)
  return db.transaction(async (tx) => {
    const conflicts: RecipeReplicationDocument[] = []

    for (const row of rows) {
      const conflict = await pushRecipe(tx, row)
      if (conflict) conflicts.push(conflict)
    }

    return conflicts
  })
}

async function pushRecipe(
  tx: ReplicationTransaction,
  row: z.infer<typeof pushRowSchema>,
): Promise<RecipeReplicationDocument | undefined> {
  const incoming = row.newDocumentState
  const existing = await tx.query.recipes.findFirst({
    where: eq(recipes.syncId, incoming.syncId),
  })

  if (incoming._deleted) {
    if (!existing) return
    if (
      !row.assumedMasterState ||
      existing.revision !== row.assumedMasterState.serverRevision
    ) {
      return toDocument(existing)
    }
    await tx.delete(recipes).where(eq(recipes.id, existing.id))
    await recordRecipeReplicationDeletion(tx, existing.syncId)
    return
  }

  if (!existing) {
    const [created] = await tx
      .insert(recipes)
      .values({
        name: incoming.name,
        syncId: incoming.syncId,
        brewingMethodId: incoming.brewingMethodId,
        beanId: incoming.beanId ?? null,
        drinkTypeId: incoming.drinkTypeId ?? null,
        revision: 0,
      })
      .returning()
    if (!created) throw new Error('Recipe replication insert returned no row')
    await recordRecipeReplicationChange(tx, created)
    return
  }

  // A retried request can arrive after its transaction committed but before
  // the client received the response. Treat the document as already applied.
  if (isAlreadyAppliedRecipe(incoming, existing, row.assumedMasterState)) {
    return
  }

  if (
    !row.assumedMasterState ||
    existing.revision !== row.assumedMasterState.serverRevision
  ) {
    return toDocument(existing)
  }

  const [updated] = await tx
    .update(recipes)
    .set({
      name: incoming.name,
      brewingMethodId: incoming.brewingMethodId,
      beanId: incoming.beanId ?? null,
      drinkTypeId: incoming.drinkTypeId ?? null,
      revision: existing.revision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(eq(recipes.id, existing.id), eq(recipes.revision, existing.revision)),
    )
    .returning()
  if (!updated) {
    const current = await tx.query.recipes.findFirst({
      where: eq(recipes.id, existing.id),
    })
    return current ? toDocument(current) : undefined
  }
  await recordRecipeReplicationChange(tx, updated)
}
