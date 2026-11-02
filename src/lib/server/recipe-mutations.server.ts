import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  allocateJournalIds,
  type JournalMutation,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { recipes } from '@/db/schema'
import { replaceRecipeAccessoryGear } from './accessory-gear.server'
import { clientOperationMutations } from './client-operations.server'
import { replaceRecipeDrinkOptions } from './drink-options.server'
import { recipeReplicationMutation } from './replication-shared'

type RecipeValues = Omit<
  typeof recipes.$inferInsert,
  'ownerId' | 'id' | 'syncId' | 'revision' | 'createdAt' | 'clientOperationId'
>

export async function prepareRecipeWrite({
  values,
  existing,
  accessoryGearIds,
  drinkOptionValueIds,
  operationId,
}: {
  values: RecipeValues
  existing?: typeof recipes.$inferSelect
  accessoryGearIds: readonly number[]
  drinkOptionValueIds: readonly number[]
  operationId?: string
}) {
  const [allocatedId] = existing
    ? [existing.id]
    : await allocateJournalIds(recipes)
  if (allocatedId === undefined)
    throw new Error('Could not allocate recipe identifier')
  const id = allocatedId
  const syncId = existing?.syncId ?? crypto.randomUUID()
  const revision = existing ? existing.revision + 1 : 0
  const updatedAt = new Date()
  const write = { ...values, updatedAt }
  const mutations: JournalMutation[] = [
    {
      statement: existing
        ? db
            .update(recipes)
            .set({ ...write, revision })
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
              journalInsertValues({
                ...write,
                id,
                syncId,
                revision,
                clientOperationId: operationId ?? null,
              }),
            )
            .getSQL(),
      expectedChanges: 1,
      conflictMessage:
        'This recipe changed on the server. Reload and try again.',
    },
    ...(await replaceRecipeAccessoryGear(id, accessoryGearIds)),
    ...(await replaceRecipeDrinkOptions(id, drinkOptionValueIds)),
    recipeReplicationMutation({
      id,
      syncId,
      revision,
      updatedAt,
      name: values.name,
      brewingMethodId: values.brewingMethodId,
      beanId: values.beanId ?? null,
      drinkTypeId: values.drinkTypeId ?? null,
    }),
    ...clientOperationMutations({ operationId, recipeId: id }),
  ]
  return { id, mutations }
}
