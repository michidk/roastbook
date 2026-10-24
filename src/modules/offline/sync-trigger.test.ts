import { describe, expect, test } from 'bun:test'
import {
  notifyPendingSyncFinished,
  requestPendingSync,
  subscribeToPendingSync,
  subscribeToPendingSyncFinished,
} from '@/modules/offline/sync-trigger'

describe('offline sync triggers', () => {
  test('notifies sync request listeners until they unsubscribe', () => {
    let requests = 0
    const unsubscribe = subscribeToPendingSync(() => {
      requests += 1
    })

    requestPendingSync()
    requestPendingSync()
    unsubscribe()
    requestPendingSync()

    expect(requests).toBe(2)
  })

  test('notifies sync completion listeners until they unsubscribe', () => {
    let completions = 0
    const unsubscribe = subscribeToPendingSyncFinished(() => {
      completions += 1
    })

    notifyPendingSyncFinished()
    notifyPendingSyncFinished()
    unsubscribe()
    notifyPendingSyncFinished()

    expect(completions).toBe(2)
  })
})
