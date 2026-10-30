import type { Collection, NonSingleResult, UtilsRecord } from '@tanstack/db'
import { createCollection } from '@tanstack/db'
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'
import { getOfflineRxDatabase } from './offline-database'

export type OfflineRecipe = Omit<RecipeReplicationDocument, '_deleted'>
type RecipeCollection = Collection<
  OfflineRecipe,
  string,
  UtilsRecord,
  never,
  OfflineRecipe
> &
  NonSingleResult

let collectionPromise: Promise<RecipeCollection> | undefined

export async function getRecipeCollection() {
  collectionPromise ??= getOfflineRxDatabase().then(
    (database) =>
      createCollection<OfflineRecipe, string>(
        rxdbCollectionOptions<OfflineRecipe>({
          rxCollection: database.recipes as never,
          startSync: true,
          syncBatchSize: 250,
        }) as unknown as Parameters<
          typeof createCollection<OfflineRecipe, string>
        >[0],
      ) as unknown as RecipeCollection,
  )
  return collectionPromise
}
