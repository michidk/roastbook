import {
  getOfflineRxDatabase,
  resetOfflineRxDatabase,
} from '@/modules/rxdb/offline-database'
import { listOperations } from './operation-queue'

/** Test-only reset for the shared RxDB database. */
export async function resetOfflineDatabaseForTests(): Promise<void> {
  await deleteOfflineDatabase()
}

/** Removes all local offline data. */
export async function deleteOfflineDatabase(): Promise<void> {
  await resetOfflineRxDatabase()
}

/**
 * Clears cached entities, references, recipes, and blobs while preserving the
 * operation log and sync metadata.
 */
export async function clearOfflineCaches(): Promise<void> {
  const database = await getOfflineRxDatabase()
  const entities = await database.entities.find().exec()
  await Promise.all(
    entities
      .filter(
        (entity) =>
          entity.entityType !== 'settings' ||
          entity.localId.startsWith('reference:'),
      )
      .map((entity) => entity.remove()),
  )
  await database.recipes.find().remove()
  const referencedBlobKeys = new Set(
    (await listOperations()).flatMap((operation) => operation.blobKeys),
  )
  const blobs = await database.blobs.find().exec()
  await Promise.all(
    blobs
      .filter((blob) => !referencedBlobKeys.has(blob.id))
      .map((blob) => blob.remove()),
  )
}
