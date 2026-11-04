import { and, eq } from 'drizzle-orm'
import { recipes } from '@/db/schema'
import { replaceRecipeAccessoryGear } from '@/journal/domain/accessory-gear'
import { replaceRecipeDrinkOptions } from '@/journal/domain/drink-options'
import { journalNow, journalUuid } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'

type RecipeValues = Omit<
  typeof recipes.$inferInsert,
  'ownerId' | 'id' | 'syncId' | 'revision' | 'createdAt'
>

export async function prepareRecipeWrite({
  values,
  existing,
  accessoryGearIds,
  drinkOptionValueIds,
}: {
  values: RecipeValues
  existing?: typeof recipes.$inferSelect
  accessoryGearIds: readonly number[]
  drinkOptionValueIds: readonly number[]
}) {
  const [allocatedId] = existing
    ? [existing.id]
    : await allocateJournalIds(recipes)
  if (allocatedId === undefined)
    throw new Error('Could not allocate recipe identifier')
  const id = allocatedId
  const syncId = existing?.syncId ?? journalUuid()
  const revision = existing ? existing.revision + 1 : 0
  const updatedAt = journalNow()
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
              }),
            )
            .getSQL(),
      expectedChanges: 1,
      conflictMessage:
        'This recipe changed on the server. Reload and try again.',
    },
    ...(await replaceRecipeAccessoryGear(id, accessoryGearIds)),
    ...(await replaceRecipeDrinkOptions(id, drinkOptionValueIds)),
  ]
  return { id, mutations }
}
