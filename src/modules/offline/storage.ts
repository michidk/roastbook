import {
  getOfflineRxDatabase,
  resetOfflineRxDatabase,
} from '@/modules/rxdb/offline-database'

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
  await database.blobs.find().remove()
}
