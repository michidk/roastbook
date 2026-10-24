import { pendingBrewToOperation } from './pending-brew-operation'
import type { PendingBrew } from './types'

const DATABASE_NAME = 'roastbook-offline'
const DATABASE_VERSION = 4

export const OPERATIONS_STORE = 'operations'
export const LOCAL_ENTITIES_STORE = 'local-entities'
export const REFERENCE_STORE = 'reference-data'
export const SYNC_METADATA_STORE = 'sync-metadata'
export const OFFLINE_BLOBS_STORE = 'offline-blobs'

const LEGACY_PENDING_STORE = 'pending-brews'
const STATUS_INDEX = 'status'
const CREATED_AT_INDEX = 'createdAt'
const NEXT_ATTEMPT_AT_INDEX = 'nextAttemptAt'
const OWNER_INDEX = 'ownerKey'
const OWNER_ENTITY_INDEX = 'ownerEntity'
export const OWNER_ENTITY_SERVER_INDEX = 'ownerEntityServer'
const ENTITY_TYPE_INDEX = 'entityType'

let databasePromise: Promise<IDBDatabase> | undefined

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Offline storage request failed'))
  })
}

export function transactionToPromise(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Offline storage write failed'))
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Offline storage write was aborted'),
      )
  })
}

function createOperationStores(database: IDBDatabase): void {
  const operations = database.createObjectStore(OPERATIONS_STORE, {
    keyPath: 'id',
  })
  operations.createIndex(STATUS_INDEX, 'status')
  operations.createIndex(CREATED_AT_INDEX, 'createdAt')
  operations.createIndex(NEXT_ATTEMPT_AT_INDEX, 'nextAttemptAt')
  operations.createIndex(OWNER_INDEX, 'ownerKey')
  operations.createIndex(OWNER_ENTITY_INDEX, [
    'ownerKey',
    'entityType',
    'entityLocalId',
  ])
}

function createLocalEntityStore(database: IDBDatabase): void {
  const entities = database.createObjectStore(LOCAL_ENTITIES_STORE, {
    keyPath: 'key',
  })
  entities.createIndex(OWNER_INDEX, 'ownerKey')
  entities.createIndex(ENTITY_TYPE_INDEX, 'entityType')
  entities.createIndex(OWNER_ENTITY_INDEX, ['ownerKey', 'entityType'])
  entities.createIndex(OWNER_ENTITY_SERVER_INDEX, [
    'ownerKey',
    'entityType',
    'serverId',
  ])
}

function createOfflineBlobStore(database: IDBDatabase): void {
  const blobs = database.createObjectStore(OFFLINE_BLOBS_STORE, {
    keyPath: 'key',
  })
  blobs.createIndex(OWNER_INDEX, 'ownerKey')
  blobs.createIndex(ENTITY_TYPE_INDEX, 'entityType')
  blobs.createIndex(OWNER_ENTITY_INDEX, ['ownerKey', 'entityType', 'entityId'])
}

function migrateLegacyPendingBrews(
  database: IDBDatabase,
  transaction: IDBTransaction,
): void {
  const legacy = transaction.objectStore(LEGACY_PENDING_STORE)
  const request = legacy.getAll()
  request.onsuccess = () => {
    const operations = transaction.objectStore(OPERATIONS_STORE)
    for (const item of request.result as PendingBrew[]) {
      operations.put(pendingBrewToOperation(item))
    }
    database.deleteObjectStore(LEGACY_PENDING_STORE)
  }
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new Error('Offline storage is unavailable in this browser'),
    )
  }

  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      const transaction = request.transaction

      if (!database.objectStoreNames.contains(OPERATIONS_STORE)) {
        createOperationStores(database)
      }
      if (!database.objectStoreNames.contains(LOCAL_ENTITIES_STORE)) {
        createLocalEntityStore(database)
      }
      if (!database.objectStoreNames.contains(OFFLINE_BLOBS_STORE)) {
        createOfflineBlobStore(database)
      }
      if (!database.objectStoreNames.contains(REFERENCE_STORE)) {
        database.createObjectStore(REFERENCE_STORE)
      }
      if (!database.objectStoreNames.contains(SYNC_METADATA_STORE)) {
        database.createObjectStore(SYNC_METADATA_STORE)
      }
      if (
        transaction &&
        database.objectStoreNames.contains(LOCAL_ENTITIES_STORE)
      ) {
        const entities = transaction.objectStore(LOCAL_ENTITIES_STORE)
        if (!entities.indexNames.contains(OWNER_ENTITY_SERVER_INDEX)) {
          entities.createIndex(OWNER_ENTITY_SERVER_INDEX, [
            'ownerKey',
            'entityType',
            'serverId',
          ])
        }
      }
      if (
        transaction &&
        database.objectStoreNames.contains(LEGACY_PENDING_STORE)
      ) {
        migrateLegacyPendingBrews(database, transaction)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open offline storage'))
    request.onblocked = () =>
      reject(new Error('Offline storage is blocked by another tab'))
  })
    .then((database) => {
      database.onclose = () => {
        databasePromise = undefined
      }
      database.onversionchange = () => {
        database.close()
        databasePromise = undefined
      }
      return database
    })
    .catch((error) => {
      databasePromise = undefined
      throw error
    })

  return databasePromise
}

/** Test-only reset so each offline storage test starts from an empty database. */
export async function resetOfflineDatabaseForTests(): Promise<void> {
  await deleteOfflineDatabase()
}

/** Removes everything this browser stored for offline journaling. */
export async function deleteOfflineDatabase(): Promise<void> {
  const database = await databasePromise?.catch(() => undefined)
  database?.close()
  databasePromise = undefined

  if (typeof indexedDB === 'undefined') return

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error('Could not clear offline storage'))
    request.onblocked = () =>
      reject(
        new Error(
          'Close other Roastbook tabs before clearing local offline data',
        ),
      )
  })
}

/**
 * Clears cached entities and reference snapshots while preserving the
 * operation log, including unsynced work and the last-sync marker.
 */
export async function clearOfflineCaches(): Promise<void> {
  const database = await openOfflineDatabase()
  const transaction = database.transaction(
    [LOCAL_ENTITIES_STORE, REFERENCE_STORE],
    'readwrite',
  )
  transaction.objectStore(LOCAL_ENTITIES_STORE).clear()
  transaction.objectStore(REFERENCE_STORE).clear()
  await transactionToPromise(transaction)
}
