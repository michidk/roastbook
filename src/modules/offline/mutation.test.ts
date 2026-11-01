import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { enqueueRecipeCreate } from './entity-operations'
import { runJournalMutation } from './mutation'
import { listOperations } from './operation-queue'
import { resetOfflineDatabaseForTests } from './storage'

beforeEach(resetOfflineDatabaseForTests)
afterAll(resetOfflineDatabaseForTests)

describe('journal persistence boundary', () => {
  const enqueue = () =>
    enqueueRecipeCreate(
      { name: 'Morning', brewingMethodId: 1 },
      { label: 'Morning' },
    )

  test('returns the server result and creates no queued operation when online', async () => {
    const result = await runJournalMutation({
      online: () => true,
      send: async () => ({ id: 4 }),
      enqueue,
    })
    expect(result).toEqual({ kind: 'saved', value: { id: 4 } })
    expect(await listOperations()).toHaveLength(0)
  })

  test('persists offline work without attempting the server', async () => {
    const result = await runJournalMutation({
      online: () => false,
      send: async () => {
        throw new Error('must not contact server')
      },
      enqueue,
    })
    expect(result.kind).toBe('queued')
    expect(await listOperations()).toMatchObject([
      {
        entityType: 'recipe',
        operationType: 'create',
        payload: { name: 'Morning' },
      },
    ])
  })

  test('persists a failed transport request but propagates validation, conflict, and permission failures', async () => {
    expect(
      (
        await runJournalMutation({
          online: () => true,
          send: async () => {
            throw new TypeError('Failed to fetch Roastbook')
          },
          enqueue,
        })
      ).kind,
    ).toBe('queued')
    for (const message of [
      'Invalid input',
      'Conflict: changed on the server',
      'Forbidden',
    ]) {
      await expect(
        runJournalMutation({
          online: () => true,
          send: async () => {
            throw new Error(message)
          },
          enqueue,
        }),
      ).rejects.toThrow(message)
    }
    expect(await listOperations()).toHaveLength(1)
  })

  test('does not report saved work when browser storage fails', async () => {
    await expect(
      runJournalMutation({
        online: () => false,
        send: async () => 1,
        enqueue: async () => {
          throw new Error('Quota exceeded')
        },
      }),
    ).rejects.toThrow('Quota exceeded')
  })

  test('a failed post-save UI refresh cannot enqueue a duplicate server write', async () => {
    const result = await runJournalMutation({
      online: () => true,
      send: async () => ({ id: 4 }),
      enqueue,
    })
    if (result.kind === 'saved') {
      await expect(
        Promise.reject(new TypeError('Failed to fetch during navigation')),
      ).rejects.toThrow('during navigation')
    }
    expect(await listOperations()).toHaveLength(0)
  })
})
