// One-time move of work queued by the previous offline mode (RxDB) into the
// journal. The old stores are deleted only when every pending change moved.
import { getJournalFunction } from '@/journal/function'
import '@/journal/registry'
import { decodeBase64 } from '@/lib/base64'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import type { LocalJournal } from './client'

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

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Earlier clients sent this id; the server keeps it as a receipt. */
function operationKey(operation: LegacyOperation) {
  const sent = operation.payload?.clientOperationId
  if (typeof sent === 'string' && uuid.test(sent)) return sent
  return uuid.test(operation.id) ? operation.id : crypto.randomUUID()
}

const createdTables: Record<string, string> = {
  'brew/create': 'id:brews',
  'brew/save-to-recipe': 'id:brews',
  'recipe/create': 'id:recipes',
  'brew-image/upload': 'id:brew_images',
}

async function apply(
  journal: LocalJournal,
  operation: LegacyOperation,
  blobs: Map<string, LegacyBlob>,
  key: string,
): Promise<number | undefined> {
  const run = async (name: string, data: unknown) => {
    const write = getJournalFunction(name)
    if (!write) throw new Error(`Unsupported earlier change: ${name}`)
    return (await journal.run(write, data, { key })) as { id: number }
  }
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
  if (kind === 'brew/create') return (await run('shots/createShot', payload)).id
  if (kind === 'brew/update')
    return (await run('shots/updateShot', withRevision(operation))).id
  if (kind === 'brew/delete')
    return void (await run('shots/deleteShot', deletion))
  if (kind === 'brew/save-to-recipe') {
    if (payload.shot) {
      const created = (await run(
        'shots/createShotAndSaveRecipe',
        payload,
      )) as unknown as { shot: { id: number } }
      return created.shot.id
    }
    await run('recipes/saveShotAsRecipe', {
      shotId: payload.shotId,
      ...(payload.target as object),
    })
    return Number(payload.shotId)
  }
  if (kind === 'recipe/create')
    return (await run('recipes/createRecipe', payload)).id
  if (kind === 'recipe/update')
    return (await run('recipes/updateRecipe', withRevision(operation))).id
  if (kind === 'recipe/delete')
    return void (await run('recipes/deleteRecipe', deletion))
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
      await run(
        'images/uploadEntityImage',
        createEntityImageUploadFormData(entityType, entityId, file),
      )
    ).id
  }
  if (kind === 'brew-image/remove-image')
    return void (await run('images/deleteEntityImage', {
      entityType,
      entityId,
      imageId: Number(payload.imageId ?? 0),
      idempotent: true,
    }))
  throw new Error(`Unsupported earlier change: ${kind}`)
}

/**
 * Moves pending earlier changes into the journal and returns how many could
 * not move. Safe to run again: a change keeps its key, so one that already
 * moved is skipped here and applied at most once by the server.
 */
export async function migrateLegacyOffline(journal: LocalJournal) {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return 0
  const database = legacyDatabase(journal.options.identity().id)
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
    const key = operationKey(operation)
    try {
      const moved = await journal.client.query<{
        recorded: Record<string, unknown[]>
      }>('select recorded from roastbook_local.outbox where key = $1', [key])
      const recorded = moved.rows[0]?.recorded
      const table =
        createdTables[`${operation.entityType}/${operation.operationType}`]
      const id = recorded
        ? (table && Number(recorded[table]?.[0])) || undefined
        : await apply(journal, operation, blobs, key)
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
