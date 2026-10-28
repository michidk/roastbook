import type { Collection, NonSingleResult, UtilsRecord } from '@tanstack/db'
import { createCollection } from '@tanstack/db'
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection'
import type { RxCollection, RxDatabase } from 'rxdb'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'

export type OfflineRecipe = Omit<RecipeReplicationDocument, '_deleted'>
type RecipeCollection = Collection<
  OfflineRecipe,
  string,
  UtilsRecord,
  never,
  OfflineRecipe
> &
  NonSingleResult

const recipeSchema = {
  title: 'roastbook recipes',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    serverId: { type: ['number', 'null'] },
    syncId: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    brewingMethodId: { type: 'number' },
    beanId: { type: ['number', 'null'] },
    drinkTypeId: { type: ['number', 'null'] },
    revision: { type: 'number' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'syncId',
    'name',
    'brewingMethodId',
    'revision',
    'updatedAt',
  ],
  indexes: ['updatedAt', 'syncId'],
  additionalProperties: false,
} as const

export type RecipeRxCollection = RxCollection<OfflineRecipe>
export type RoastbookRxDatabase = RxDatabase<{ recipes: RecipeRxCollection }>

export async function createRecipeDatabase(): Promise<RoastbookRxDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('The Roastbook RxDB database is browser-only')
  }

  const [{ createRxDatabase }, { getRxStorageDexie }] = await Promise.all([
    import('rxdb'),
    import('rxdb/plugins/storage-dexie'),
  ])
  const database = await createRxDatabase<RoastbookRxDatabase>({
    name: 'roastbook-rxdb',
    storage: getRxStorageDexie(),
    multiInstance: true,
  })
  await database.addCollections({
    recipes: { schema: recipeSchema },
  })
  return database
}

let databasePromise: Promise<RoastbookRxDatabase> | undefined
let collectionPromise: Promise<RecipeCollection> | undefined

export function getRecipeDatabase(): Promise<RoastbookRxDatabase> {
  databasePromise ??= createRecipeDatabase().catch((error: unknown) => {
    databasePromise = undefined
    throw error
  })
  return databasePromise
}

export async function getRecipeCollection() {
  collectionPromise ??= getRecipeDatabase().then((database) =>
    createCollection<OfflineRecipe, string>(
      rxdbCollectionOptions<OfflineRecipe>({
        rxCollection: database.recipes,
        startSync: true,
        syncBatchSize: 250,
      }),
    ),
  )
  if (!collectionPromise)
    throw new Error('Could not initialize the recipe collection')
  return collectionPromise
}
