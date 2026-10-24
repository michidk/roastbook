import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  getLocalEntity,
  putLocalEntity,
  readOfflineSyncMetadata,
  recordSuccessfulSync,
} from '@/modules/offline/local-data'
import {
  getOperation,
  listOperations,
  putOperation,
} from '@/modules/offline/operation-queue'
import {
  DEFAULT_OWNER_KEY,
  type OfflineOperation,
} from '@/modules/offline/operations'
import {
  readCachedReferenceData,
  writeCachedReferenceData,
} from '@/modules/offline/queue'
import {
  clearOfflineCaches,
  deleteOfflineDatabase,
  resetOfflineDatabaseForTests,
} from '@/modules/offline/storage'

function operation(): OfflineOperation {
  return {
    id: 'operation-1',
    idempotencyKey: 'operation-1',
    ownerKey: DEFAULT_OWNER_KEY,
    entityType: 'brew',
    operationType: 'create',
    entityLocalId: 'operation-1',
    entityServerId: null,
    payload: { doseGrams: '18.00' },
    details: null,
    dependencyIds: [],
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: '2026-10-24T08:00:00.000Z',
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
    baseRevision: null,
    acknowledgedAt: null,
    cancelledAt: null,
    blobKeys: [],
  }
}

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline storage maintenance', () => {
  test('clears caches but keeps the operation log and sync metadata', async () => {
    await putOperation(operation())
    await putLocalEntity({
      entityType: 'brew',
      localId: 'operation-1',
      data: { doseGrams: '18.00' },
      syncState: 'pending',
    })
    await writeCachedReferenceData('new-brew', 1, { beans: ['Konga'] })
    await recordSuccessfulSync('local', '2026-10-24T08:30:00.000Z')

    await clearOfflineCaches()

    expect(await getOperation('operation-1')).toBeDefined()
    expect(await getLocalEntity('brew', 'operation-1')).toBeUndefined()
    expect(await readCachedReferenceData('new-brew', 1)).toBeUndefined()
    expect((await readOfflineSyncMetadata()).lastSuccessfulSyncAt).toBe(
      '2026-10-24T08:30:00.000Z',
    )
  })

  test('deletes the whole offline database', async () => {
    await putOperation(operation())

    await deleteOfflineDatabase()

    expect(await listOperations()).toEqual([])
    expect((await readOfflineSyncMetadata()).lastSuccessfulSyncAt).toBeNull()
  })
})
