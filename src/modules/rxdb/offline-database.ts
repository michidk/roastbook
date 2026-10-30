import type { RxCollection, RxDatabase } from 'rxdb'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'
import type { LocalEntityRecord } from '@/modules/offline/local-data'
import type {
  OfflineEntityType,
  OfflineOperation,
} from '@/modules/offline/operations'
import {
  blobSchema,
  entitySchema,
  operationSchema,
  recipeSchema,
} from './schemas'

export type OfflineOperationDocument = OfflineOperation
export type OfflineRecipeDocument = Omit<RecipeReplicationDocument, '_deleted'>
export type OfflineBlobDocument = {
  readonly id: string
  readonly ownerKey: string
  readonly entityType: OfflineEntityType
  readonly entityId: string
  readonly filename: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly createdAt: string
  readonly data: string
}
export type OfflineEntityDocument = Omit<
  LocalEntityRecord,
  'key' | 'revision'
> & {
  readonly id: string
  readonly entityRevision: string | null
}

type OfflineCollections = {
  operations: RxCollection<OfflineOperationDocument>
  entities: RxCollection<OfflineEntityDocument>
  recipes: RxCollection<OfflineRecipeDocument>
  blobs: RxCollection<OfflineBlobDocument>
}

export type OfflineRxDatabase = RxDatabase<OfflineCollections>

let databasePromise: Promise<OfflineRxDatabase> | undefined

export async function getOfflineRxDatabase(): Promise<OfflineRxDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('The Roastbook offline database is browser-only')
  }
  databasePromise ??= Promise.all([
    import('rxdb'),
    import('rxdb/plugins/storage-dexie'),
    import('rxdb/plugins/migration-schema'),
  ])
    .then(
      async ([
        { addRxPlugin, createRxDatabase },
        { getRxStorageDexie },
        { RxDBMigrationSchemaPlugin },
      ]) => {
        addRxPlugin(RxDBMigrationSchemaPlugin)
        const database = await createRxDatabase<OfflineRxDatabase>({
          name: 'roastbook-offline-rxdb',
          storage: getRxStorageDexie(),
          multiInstance: true,
        })
        await database.addCollections({
          operations: { schema: operationSchema },
          entities: { schema: entitySchema },
          recipes: { schema: recipeSchema },
          blobs: { schema: blobSchema },
        })
        return database
      },
    )
    .catch((error: unknown) => {
      databasePromise = undefined
      throw error
    })
  return databasePromise
}

export async function resetOfflineRxDatabase(): Promise<void> {
  const database = await databasePromise?.catch(() => undefined)
  if (database) await database.close()
  databasePromise = undefined
  const { removeRxDatabase } = await import('rxdb')
  const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie')
  await removeRxDatabase('roastbook-offline-rxdb', getRxStorageDexie())
}
