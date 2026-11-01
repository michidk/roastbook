import 'fake-indexeddb/auto'
import { afterAll, beforeEach, expect, test } from 'bun:test'
import { newShotPayload } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'
import {
  cacheEntityDetail,
  readCachedEntityDetail,
} from '@/modules/offline/entity-detail-cache'
import { getOperation, listOperations } from '@/modules/offline/operation-queue'
import { updateQueuedBrewPayload } from '@/modules/offline/pending-store'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'
import {
  isPendingBrewHeldForTasting,
  releasePendingBrewForTasting,
} from '@/modules/offline/tasting-holds'
import {
  addBrew,
  addRecipe,
  editBrew,
  editRecipe,
  removeJournalEntity,
  saveBrewToRecipe,
} from './journal'
import { addJournalPicture, removeJournalPicture } from './journal-images'

const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const oldOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine')
beforeEach(async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  })
  await resetOfflineDatabaseForTests()
})
afterAll(async () => {
  await resetOfflineDatabaseForTests()
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
  else Reflect.deleteProperty(globalThis, 'window')
  if (oldOnline) Object.defineProperty(navigator, 'onLine', oldOnline)
  else Reflect.deleteProperty(navigator, 'onLine')
})

test('recipe commands persist validated creates, revisioned edits, and deletes through one boundary', async () => {
  const result = await addRecipe(
    { name: 'Morning', brewingMethodId: 1 },
    { label: 'Morning' },
  )
  expect(result.kind).toBe('queued')
  await expect(
    Promise.resolve().then(() =>
      addRecipe({ name: '', brewingMethodId: 1 }, { label: 'Invalid' }),
    ),
  ).rejects.toThrow()
  expect(await listOperations()).toHaveLength(1)
  await cacheEntityDetail('recipe', 4, {
    recipe: { id: 4, name: 'Morning', revision: 3 },
  })
  const edit = await editRecipe(
    { id: 4, name: 'Afternoon', brewingMethodId: 1, baseRevision: 3 },
    { label: 'Afternoon' },
  )
  expect(edit.kind).toBe('queued')
  expect(await readCachedEntityDetail('recipe', 4)).toMatchObject({
    data: { recipe: { name: 'Afternoon' } },
  })
  await removeJournalEntity({
    entityType: 'recipe',
    id: 4,
    revision: 3,
    details: { label: 'Afternoon' },
  })
  expect(await readCachedEntityDetail('recipe', 4)).toBeUndefined()
  expect(await listOperations()).toMatchObject([
    { operationType: 'create' },
    { operationType: 'update', baseRevision: '3' },
    { operationType: 'delete', baseRevision: '3' },
  ])
})

test('brew creation holds its queued write for tasting and preserves the same idempotency key', async () => {
  const data = newShotPayload(
    { ...EMPTY_SHOT_FORM_VALUES, brewingMethodId: '1' },
    [],
    { brewedAt: '2026-10-25T09:30' },
  )
  const result = await addBrew({
    data,
    target: null,
    holdForTasting: true,
    summary: {
      beanName: null,
      methodName: 'Espresso',
      brewedAt: new Date().toISOString(),
      doseGrams: null,
      yieldGrams: null,
      shotTimeSeconds: null,
    },
  })
  if (result.kind !== 'queued')
    throw new Error('Expected a durable queued brew')
  expect(isPendingBrewHeldForTasting(result.operationId)).toBe(true)
  await updateQueuedBrewPayload(result.operationId, {
    ...data,
    rating: 4,
    clientOperationId: result.operationId,
  })
  expect(await getOperation(result.operationId)).toMatchObject({
    idempotencyKey: result.operationId,
    payload: {
      rating: 4,
      clientOperationId: result.operationId,
      brewedAt: data.brewedAt,
    },
  })
  releasePendingBrewForTasting(result.operationId)
  expect(isPendingBrewHeldForTasting(result.operationId)).toBe(false)
})

test('tasting after a saved brew and save-to-recipe both queue without a connection', async () => {
  const edit = await editBrew(
    { id: 8, brewingMethodId: 1, rating: 5 },
    { label: 'Brew', detail: 'Tasting' },
  )
  expect(edit.kind).toBe('queued')
  expect((await listOperations())[0]).toMatchObject({
    entityServerId: '8',
    operationType: 'update',
    payload: { rating: 5 },
  })
  expect(
    (
      await saveBrewToRecipe(
        { shotId: 8, name: 'Afternoon' },
        { label: 'Brew' },
      )
    ).kind,
  ).toBe('queued')
})

test('brew pictures use the same durable queue while other entity pictures stay online-only', async () => {
  const file = new File(['coffee'], 'brew.webp', { type: 'image/webp' })
  const picture = { file, preview: 'blob:qa', base64: 'Y29mZmVl' }
  expect(
    (await addJournalPicture({ entityType: 'shots', entityId: 8 }, picture))
      .kind,
  ).toBe('queued')
  expect(
    (
      await removeJournalPicture({
        entityType: 'shots',
        entityId: 8,
        imageId: 9,
      })
    ).kind,
  ).toBe('queued')
  await expect(
    addJournalPicture({ entityType: 'gear', entityId: 8 }, picture),
  ).rejects.toThrow('Connect to the server')
  expect(await listOperations()).toMatchObject([
    { operationType: 'upload', blobKeys: [expect.any(String)] },
    { operationType: 'remove-image' },
  ])
})
