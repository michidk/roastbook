import type { RxCollection, RxDatabase } from 'rxdb'
import type { LocalEntityRecord } from '@/modules/offline/local-data'
import type { OfflineOperation } from '@/modules/offline/operations'
import { pendingBrewToOperation } from '@/modules/offline/pending-brew-operation'
import type { PendingBrew } from '@/modules/offline/types'
import type { RecipeReplicationDocument } from '@/lib/replication-contracts'

export type OfflineOperationDocument = OfflineOperation
export type OfflineRecipeDocument = Omit<RecipeReplicationDocument, '_deleted'>
export type OfflineBlobDocument = {
  readonly id: string
  readonly ownerKey: string
  readonly entityType: string
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

const operationSchema = {
  title: 'roastbook offline operations',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    idempotencyKey: { type: 'string', maxLength: 128 },
    ownerKey: { type: 'string', maxLength: 128 },
    entityType: { type: 'string' },
    operationType: { type: 'string' },
    entityLocalId: { type: 'string', maxLength: 128 },
    entityServerId: { type: ['string', 'null'] },
    payload: {},
    details: {},
    dependencyIds: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    status: { type: 'string' },
    attempts: { type: 'number' },
    lastError: { type: ['string', 'null'] },
    nextAttemptAt: { type: ['string', 'null'] },
    baseRevision: { type: ['string', 'null'] },
    acknowledgedAt: { type: ['string', 'null'] },
    cancelledAt: { type: ['string', 'null'] },
    blobKeys: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'id',
    'idempotencyKey',
    'ownerKey',
    'entityType',
    'operationType',
    'entityLocalId',
    'entityServerId',
    'dependencyIds',
    'createdAt',
    'updatedAt',
    'status',
    'attempts',
    'lastError',
    'nextAttemptAt',
    'baseRevision',
    'acknowledgedAt',
    'cancelledAt',
    'blobKeys',
  ],
  indexes: ['ownerKey', 'status', 'createdAt', 'updatedAt'],
  additionalProperties: false,
} as const

const entitySchema = {
  title: 'roastbook offline entities',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 512 },
    ownerKey: { type: 'string', maxLength: 128 },
    entityType: { type: 'string' },
    localId: { type: 'string', maxLength: 128 },
    serverId: { type: ['string', 'null'] },
    data: {},
    entityRevision: { type: ['string', 'null'] },
    syncState: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: [
    'id',
    'ownerKey',
    'entityType',
    'localId',
    'serverId',
    'entityRevision',
    'syncState',
    'updatedAt',
  ],
  indexes: ['ownerKey', 'entityType', 'updatedAt'],
  additionalProperties: false,
} as const

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
    serverRevision: { type: 'number' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'syncId',
    'name',
    'brewingMethodId',
    'serverRevision',
    'updatedAt',
  ],
  indexes: ['updatedAt', 'syncId'],
  additionalProperties: false,
} as const

const blobSchema = {
  title: 'roastbook offline blobs',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    ownerKey: { type: 'string', maxLength: 128 },
    entityType: { type: 'string' },
    entityId: { type: 'string', maxLength: 128 },
    filename: { type: 'string' },
    mimeType: { type: 'string' },
    sizeBytes: { type: 'number' },
    createdAt: { type: 'string' },
    data: { type: 'string' },
  },
  required: [
    'id',
    'ownerKey',
    'entityType',
    'entityId',
    'filename',
    'mimeType',
    'sizeBytes',
    'createdAt',
    'data',
  ],
  indexes: ['ownerKey', 'entityType', 'entityId', 'createdAt'],
  additionalProperties: false,
} as const

let databasePromise: Promise<OfflineRxDatabase> | undefined

async function migrateLegacyPendingBrews(
  database: OfflineRxDatabase,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const legacy = await new Promise<PendingBrew[]>((resolve) => {
    const request = indexedDB.open('roastbook-offline')
    request.onsuccess = () => {
      const oldDatabase = request.result
      if (!oldDatabase.objectStoreNames.contains('pending-brews')) {
        oldDatabase.close()
        resolve([])
        return
      }
      const transaction = oldDatabase.transaction('pending-brews', 'readonly')
      const read = transaction.objectStore('pending-brews').getAll()
      read.onsuccess = () => {
        oldDatabase.close()
        resolve(read.result as PendingBrew[])
      }
      read.onerror = () => {
        oldDatabase.close()
        resolve([])
      }
    }
    request.onerror = () => resolve([])
    request.onupgradeneeded = () => request.transaction?.abort()
  })
  if (legacy.length === 0) return
  await database.operations.bulkInsert(legacy.map(pendingBrewToOperation))
}
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
        await migrateLegacyPendingBrews(database)
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
