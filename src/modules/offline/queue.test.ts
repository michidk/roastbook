import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'
import { newShotPayload } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'
import { getOperation } from '@/modules/offline/operation-queue'
import {
  acknowledgePendingBrew,
  deletePendingBrew,
  getPendingBrew,
  listPendingBrews,
  putPendingBrew,
  resetOfflineDatabaseForTests,
  updatePendingBrew,
} from '@/modules/offline/queue'
import {
  readCachedReferenceData,
  writeCachedReferenceData,
} from '@/modules/offline/reference-cache'
import type { PendingBrew } from '@/modules/offline/types'

function pendingBrew(overrides: Partial<PendingBrew> = {}): PendingBrew {
  const operationId = overrides.operationId ?? crypto.randomUUID()
  return {
    operationId,
    payload: {
      ...newShotPayload(
        {
          ...EMPTY_SHOT_FORM_VALUES,
          brewingMethodId: '1',
          doseGrams: '18.00',
        },
        [],
      ),
      clientOperationId: operationId,
    },
    summary: {
      beanName: 'Konga',
      methodName: 'Espresso',
      brewedAt: '2026-10-23T08:00:00.000Z',
      doseGrams: '18.00',
      yieldGrams: null,
      shotTimeSeconds: null,
    },
    createdAt: '2026-10-23T08:00:01.000Z',
    attempts: 0,
    status: 'pending',
    ...overrides,
  }
}

afterEach(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline queue storage', () => {
  test('stores, updates, lists, and deletes pending brews', async () => {
    const first = pendingBrew({ createdAt: '2026-10-23T08:00:02.000Z' })
    const second = pendingBrew({ createdAt: '2026-10-23T08:00:01.000Z' })
    await putPendingBrew(first)
    await putPendingBrew(second)

    expect((await listPendingBrews()).map((item) => item.operationId)).toEqual([
      second.operationId,
      first.operationId,
    ])

    await updatePendingBrew(first.operationId, {
      status: 'auth-required',
      attempts: 2,
    })
    expect(await getPendingBrew(first.operationId)).toMatchObject({
      status: 'auth-required',
      attempts: 2,
    })

    await deletePendingBrew(first.operationId)
    expect(await getPendingBrew(first.operationId)).toBeUndefined()
    expect(await getOperation(first.operationId)).toMatchObject({
      status: 'cancelled',
    })
    expect(await listPendingBrews()).toHaveLength(1)
  })

  test('acknowledges a synced brew and keeps the operation record', async () => {
    const item = pendingBrew()
    await putPendingBrew(item)

    await acknowledgePendingBrew(item.operationId)

    expect(await getPendingBrew(item.operationId)).toBeUndefined()
    expect(await getOperation(item.operationId)).toMatchObject({
      status: 'acknowledged',
      entityType: 'brew',
      operationType: 'create',
    })
  })

  test('does not resurrect a brew deleted between update reads', async () => {
    const item = pendingBrew()
    await putPendingBrew(item)
    await deletePendingBrew(item.operationId)

    await updatePendingBrew(item.operationId, { status: 'failed' })

    expect(await getPendingBrew(item.operationId)).toBeUndefined()
  })

  test('caches reference data and invalidates old versions', async () => {
    await writeCachedReferenceData('test-reference', 1, {
      beans: ['Konga'],
    })

    expect(await readCachedReferenceData('test-reference', 1)).toMatchObject({
      version: 1,
      data: { beans: ['Konga'] },
    })
    expect(await readCachedReferenceData('test-reference', 2)).toBeUndefined()
    expect(await readCachedReferenceData('test-reference', 1)).toBeUndefined()
  })
})
