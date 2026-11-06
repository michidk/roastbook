import { expect, test } from 'bun:test'
import { getSyncStatus, waitForSync } from './sync-status'

test('a sync within the budget is awaited without an updating notice', async () => {
  let done = false
  await waitForSync(
    Bun.sleep(5).then(() => {
      done = true
    }),
    1_000,
  )
  expect(done).toBe(true)
  expect(getSyncStatus().updating).toBe(false)
})

test('a slow sync shows the device copy as updating until it ends', async () => {
  const { promise, resolve } = Promise.withResolvers<void>()
  await waitForSync(promise, 5)
  expect(getSyncStatus().updating).toBe(true)
  resolve()
  await promise
  await Bun.sleep(0)
  expect(getSyncStatus().updating).toBe(false)
})
