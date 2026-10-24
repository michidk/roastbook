import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { getOfflineBlob, listOfflineBlobs } from '@/modules/offline/blob-store'
import {
  acceptServerConflict,
  enqueueEntityDelete,
  enqueueEntityUpdate,
  enqueueImageDelete,
  enqueueImageUpload,
  enqueueRecipeCreate,
} from '@/modules/offline/entity-operations'
import {
  getLocalEntity,
  getLocalEntityByServerId,
  putLocalEntity,
} from '@/modules/offline/local-data'
import {
  getOperation,
  listOperations,
  putOperation,
} from '@/modules/offline/operation-queue'
import { DEFAULT_OWNER_KEY } from '@/modules/offline/operations'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline entity operations', () => {
  test('queues a brew edit and merges the cached detail', async () => {
    await putLocalEntity({
      entityType: 'brew',
      localId: '1',
      serverId: '1',
      data: { shot: { id: 1, doseGrams: '18.00' } },
      syncState: 'synced',
    })

    const operationId = await enqueueEntityUpdate({
      entityType: 'brew',
      entityId: 1,
      payload: { doseGrams: '20.00', baseUpdatedAt: '2026-10-24T08:00:00Z' },
      details: { label: 'Konga', detail: 'Espresso' },
      baseRevision: '2026-10-24T08:00:00Z',
    })

    expect(await getOperation(operationId)).toMatchObject({
      entityType: 'brew',
      operationType: 'update',
      entityServerId: '1',
      baseRevision: '2026-10-24T08:00:00Z',
    })
    expect(await getLocalEntityByServerId('brew', '1')).toMatchObject({
      syncState: 'pending',
      data: { shot: { id: 1, doseGrams: '20.00' } },
    })
  })

  test('queues a deletion and removes the cached entity', async () => {
    await putLocalEntity({
      entityType: 'recipe',
      localId: '7',
      serverId: '7',
      data: { recipe: { id: 7, name: 'Morning' } },
      syncState: 'synced',
    })

    const operationId = await enqueueEntityDelete({
      entityType: 'recipe',
      entityId: 7,
      details: { label: 'Morning', detail: 'Recipe' },
      baseRevision: '2026-10-24T08:00:00Z',
    })

    expect(await getOperation(operationId)).toMatchObject({
      entityType: 'recipe',
      operationType: 'delete',
      entityServerId: '7',
    })
    expect(await getLocalEntity('recipe', '7')).toBeUndefined()
  })

  test('adds a deterministic client operation ID to recipe creates', async () => {
    const operationId = await enqueueRecipeCreate(
      { name: 'Morning', brewingMethodId: 1 },
      { label: 'Morning', detail: 'Recipe' },
    )

    expect(await getOperation(operationId)).toMatchObject({
      entityType: 'recipe',
      operationType: 'create',
      payload: {
        name: 'Morning',
        clientOperationId: operationId,
      },
    })
  })

  test('queues image uploads with a durable blob and removals', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'brew.jpg', {
      type: 'image/jpeg',
    })
    const uploadId = await enqueueImageUpload({
      entityType: 'shots',
      entityId: 4,
      file,
      details: { label: 'Brew', detail: 'brew.jpg' },
    })
    const upload = await getOperation(uploadId)
    expect(upload).toMatchObject({
      entityType: 'brew-image',
      operationType: 'upload',
      entityServerId: '4',
    })
    expect(upload?.blobKeys).toHaveLength(1)
    expect(await getOfflineBlob(upload?.blobKeys[0] ?? '')).toMatchObject({
      filename: 'brew.jpg',
    })

    const deleteId = await enqueueImageDelete({
      entityType: 'shots',
      entityId: 4,
      imageId: 9,
      details: { label: 'Brew', detail: 'Remove picture' },
    })
    expect(await getOperation(deleteId)).toMatchObject({
      entityType: 'brew-image',
      operationType: 'remove-image',
      payload: { entityType: 'shots', entityId: 4, imageId: 9 },
    })

    if (!upload) throw new Error('Upload operation missing')
    await acceptServerConflict(upload)
    expect(await listOfflineBlobs()).toHaveLength(0)
  })

  test('accepting the server copy cancels the operation and clears the cache', async () => {
    await putLocalEntity({
      entityType: 'brew',
      localId: '1',
      serverId: '1',
      data: { shot: { id: 1 } },
      syncState: 'conflict',
    })
    await putOperation({
      id: 'conflict',
      idempotencyKey: 'conflict',
      ownerKey: DEFAULT_OWNER_KEY,
      entityType: 'brew',
      operationType: 'update',
      entityLocalId: '1',
      entityServerId: '1',
      payload: {},
      details: null,
      dependencyIds: [],
      createdAt: '2026-10-24T08:00:00.000Z',
      updatedAt: '2026-10-24T08:00:00.000Z',
      status: 'conflict',
      attempts: 1,
      lastError: 'changed on the server',
      nextAttemptAt: null,
      baseRevision: '2026-10-24T07:00:00Z',
      acknowledgedAt: null,
      cancelledAt: null,
      blobKeys: [],
    })

    const operation = (await listOperations())[0]
    if (!operation) throw new Error('Operation missing')
    await acceptServerConflict(operation)

    expect((await getOperation('conflict'))?.status).toBe('cancelled')
    expect(await getLocalEntity('brew', '1')).toBeUndefined()
  })
})
