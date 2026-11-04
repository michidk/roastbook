// One-time move of work queued by the previous offline mode (RxDB) into the
// journal. The old stores are deleted only when every pending change moved.
import { deleteEntityImage, uploadEntityImage } from '@/journal/images'
import {
  createRecipe,
  deleteRecipe,
  saveShotAsRecipe,
  updateRecipe,
} from '@/journal/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  deleteShot,
  updateShot,
} from '@/journal/shots'
import { decodeBase64 } from '@/lib/base64'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'

type LegacyOperation = {
  id: string
  entityType: string
  operationType: string
  entityLocalId: string
  entityServerId: string | null
  payload: Record<string, unknown> | null
  dependencyIds: string[]
  createdAt: string
  status: string
  baseRevision: string | null
  blobKeys: string[]
  _deleted?: unknown
}
type LegacyBlob = {
  id: string
  filename: string
  mimeType: string
  data: string
  _deleted?: unknown
}

function legacyDatabase(owner: string) {
  return owner === 'local'
    ? 'roastbook-offline-rxdb'
    : `roastbook-user-${Array.from(owner)
        .map((character) => character.codePointAt(0)?.toString(16))
        .join('_')}`
}
const store = (database: string, collection: string) =>
  `rxdb-dexie-${database}--0--${collection}`

async function readDocuments<T>(name: string): Promise<T[]> {
  const existing = await indexedDB.databases()
  if (!existing.some((database) => database.name === name)) return []
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('docs')) {
        database.close()
        return resolve([])
      }
      const all = database.transaction('docs').objectStore('docs').getAll()
      all.onerror = () => reject(all.error)
      all.onsuccess = () => {
        database.close()
        resolve(
          (all.result as Array<T & { _deleted?: unknown }>).filter(
            (doc) =>
              doc._deleted !== true &&
              doc._deleted !== '1' &&
              doc._deleted !== 1,
          ),
        )
      }
    }
  })
}

function withRevision(operation: LegacyOperation) {
  const {
    baseRevision: _revision,
    baseUpdatedAt: _updatedAt,
    ...payload
  } = operation.payload ?? {}
  return {
    ...payload,
    ...(operation.baseRevision
      ? { baseRevision: Number(operation.baseRevision) }
      : {}),
  }
}

async function apply(
  operation: LegacyOperation,
  blobs: Map<string, LegacyBlob>,
): Promise<number | undefined> {
  const payload = operation.payload ?? {}
  const id = Number(operation.entityServerId ?? operation.entityLocalId)
  const deletion = {
    id,
    idempotent: true,
    ...(operation.baseRevision
      ? { baseRevision: Number(operation.baseRevision) }
      : {}),
  }
  const kind = `${operation.entityType}/${operation.operationType}`
  if (kind === 'brew/create')
    return (await createShot({ data: payload as never })).id
  if (kind === 'brew/update')
    return (await updateShot({ data: withRevision(operation) as never })).id
  if (kind === 'brew/delete') return void (await deleteShot({ data: deletion }))
  if (kind === 'brew/save-to-recipe') {
    if (payload.shot)
      return (await createShotAndSaveRecipe({ data: payload as never })).shot.id
    await saveShotAsRecipe({
      data: {
        shotId: payload.shotId,
        ...(payload.target as object),
      } as never,
    })
    return Number(payload.shotId)
  }
  if (kind === 'recipe/create')
    return (await createRecipe({ data: payload as never })).id
  if (kind === 'recipe/update')
    return (await updateRecipe({ data: withRevision(operation) as never })).id
  if (kind === 'recipe/delete')
    return void (await deleteRecipe({ data: deletion }))
  const entityType = (payload.entityType as 'shots' | undefined) ?? 'shots'
  const entityId =
    (payload.entityId as number | undefined) ?? Number(operation.entityServerId)
  if (kind === 'brew-image/upload') {
    const blob = blobs.get(operation.blobKeys[0] ?? '')
    if (!blob) throw new Error('The saved picture is missing')
    const file = new File(
      [decodeBase64(blob.data) as BlobPart],
      blob.filename,
      {
        type: blob.mimeType,
      },
    )
    return (
      await uploadEntityImage({
        data: createEntityImageUploadFormData(entityType, entityId, file),
      })
    ).id
  }
  if (kind === 'brew-image/remove-image')
    return void (await deleteEntityImage({
      data: {
        entityType,
        entityId,
        imageId: Number(payload.imageId ?? 0),
        idempotent: true,
      },
    }))
  throw new Error(`Unsupported earlier change: ${kind}`)
}

/** Moves pending earlier changes into the journal; returns how many could not move. */
export async function migrateLegacyOffline(owner: string) {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return 0
  const database = legacyDatabase(owner)
  const operations = (
    await readDocuments<LegacyOperation>(store(database, 'operations'))
  )
    .filter((op) => !['acknowledged', 'cancelled'].includes(op.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const blobs = new Map(
    (await readDocuments<LegacyBlob>(store(database, 'blobs'))).map((blob) => [
      blob.id,
      blob,
    ]),
  )
  const created = new Map<string, number>()
  let failed = 0
  for (const operation of operations) {
    const dependency = operation.dependencyIds
      .map((dependencyId) => created.get(dependencyId))
      .find((id) => id !== undefined)
    if (!operation.entityServerId && dependency !== undefined)
      operation.entityServerId = String(dependency)
    try {
      const id = await apply(operation, blobs)
      if (id !== undefined) created.set(operation.id, id)
    } catch (error) {
      failed++
      console.error('Could not move an earlier offline change', error)
    }
  }
  if (!failed)
    for (const collection of [
      '_rxdb_internal',
      'operations',
      'entities',
      'recipes',
      'blobs',
    ])
      indexedDB.deleteDatabase(store(database, collection))
  return failed
}
