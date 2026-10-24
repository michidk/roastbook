import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { newShotPayload } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'
import {
  getLocalEntity,
  markLocalEntitySynced,
} from '@/modules/offline/local-data'
import {
  acknowledgeOperation,
  getOperation,
  listOperations,
  updateOperation,
} from '@/modules/offline/operation-queue'
import { enqueuePendingBrew } from '@/modules/offline/pending-store'
import {
  listPendingBrews,
  resetOfflineDatabaseForTests,
} from '@/modules/offline/queue'
import { syncOperations } from '@/modules/offline/sync-operations'
import type { PendingBrew } from '@/modules/offline/types'

function pendingBrew(): PendingBrew {
  const operationId = crypto.randomUUID()
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
  }
}

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

describe('offline sync flow', () => {
  test('acknowledges a queued brew and marks its local entity synced', async () => {
    const item = pendingBrew()
    await enqueuePendingBrew(item)

    const result = await syncOperations({
      list: () => listOperations(),
      claim: (operation) =>
        updateOperation(operation.id, {
          status: 'in-flight',
          attempts: operation.attempts + 1,
        }),
      acknowledge: (operation, executionResult) =>
        acknowledgeOperation(operation.id, {
          serverId: executionResult.serverId ?? null,
        }),
      mark: (operation, changes) => updateOperation(operation.id, changes),
      execute: () => Promise.resolve({ serverId: '42' }),
      authenticate: () => Promise.resolve('authenticated'),
      isOnline: () => true,
      onAcknowledged: async (operation, executionResult) => {
        if (executionResult.serverId) {
          await markLocalEntitySynced('brew', operation.entityLocalId, {
            serverId: executionResult.serverId,
          })
        }
      },
    })

    expect(result.synced).toBe(1)
    expect(await listPendingBrews()).toHaveLength(0)
    expect(await getOperation(item.operationId)).toMatchObject({
      status: 'acknowledged',
      entityServerId: '42',
    })
    expect(await getLocalEntity('brew', item.operationId)).toMatchObject({
      serverId: '42',
      syncState: 'synced',
    })
  })
})
