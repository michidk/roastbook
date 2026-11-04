import { and, eq } from 'drizzle-orm'
import { recipes } from '@/db/schema'
import { replaceRecipeAccessoryGear } from '@/journal/domain/accessory-gear'
import { clientOperationMutations } from '@/journal/domain/client-operations'
import { replaceRecipeDrinkOptions } from '@/journal/domain/drink-options'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'

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
    ...clientOperationMutations({ operationId, recipeId: id }),
  ]
  return { id, mutations }
}
