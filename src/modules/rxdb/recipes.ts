import type { Collection, NonSingleResult, UtilsRecord } from '@tanstack/db'
import { createCollection } from '@tanstack/db'
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection'
import type { RxCollection } from 'rxdb'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'
import {
  getOfflineRxDatabase,
  type OfflineRxDatabase,
} from './offline-database'

export type OfflineRecipe = Omit<RecipeReplicationDocument, '_deleted'>
type RecipeCollection = Collection<
  OfflineRecipe,
  string,
  UtilsRecord,
  never,
  OfflineRecipe
> &
  NonSingleResult

export type RecipeRxCollection = RxCollection<OfflineRecipe>
export type RoastbookRxDatabase = OfflineRxDatabase
let collectionPromise: Promise<RecipeCollection> | undefined

export function getRecipeDatabase(): Promise<RoastbookRxDatabase> {
  return getOfflineRxDatabase()
}

export async function getRecipeCollection() {
  collectionPromise ??= getRecipeDatabase().then(
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
  if (!collectionPromise)
    throw new Error('Could not initialize the recipe collection')
  return collectionPromise
}
