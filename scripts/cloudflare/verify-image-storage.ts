import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { db } from '@/db'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { beanImages, gear, gearImages } from '@/db/schema'
import { getStoredImagePaths } from '@/lib/image-path'
import { commitEntityImage } from '@/lib/server/entity-image-store.server'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/lib/server/image-storage.server'
import { deleteEntityWithMedia } from '@/lib/server/media-lifecycle.server'
import { getStorage } from '@/lib/storage'
import { fixture } from './verify-journal'

async function createItem() {
  const [item] = await db
    .insert(gear)
    .values(
      journalInsertValues({
        name: crypto.randomUUID(),
        type: 'tamper' as const,
      }),
    )
    .returning()
  if (!item) throw new Error('No item')
  return item.id
}
function upload(entityId: number, bytes = 128) {
  const storagePath = `gear/${entityId}/${crypto.randomUUID()}.webp`
  const files = getStoredImagePaths([storagePath]).map((path) => ({
    path,
    buffer: Buffer.alloc(bytes),
  }))
  return commitEntityImage({
    entityType: 'gear',
    entityId,
    filename: 'phone-photo.jpg',
    storagePath,
    prepared: { files, sizeBytes: bytes, storageBytes: bytes * files.length },
  })
}

export async function verifyImageStorage(bindings: CloudflareRuntimeBindings) {
  const alice = await fixture(bindings)
  const bob = await fixture(bindings)
  assert.deepEqual(imageStoragePolicy(), {
    maxImagesPerItem: 3,
    limitBytes: 250 * 1024 * 1024,
  })
  const item = await alice.run(createItem)
  const race = await Promise.allSettled(
    Array.from({ length: 7 }, () => alice.run(() => upload(item))),
  )
  assert.equal(race.filter((result) => result.status === 'fulfilled').length, 3)
  await alice.run(async () => {
    assert.deepEqual(await loadImageStorageUsage(), {
      imageCount: 3,
      totalBytes: 3 * 128 * 3,
      unmeasuredImages: 0,
    })
    const objects = await getStorage().listObjects(`gear/${item}/`)
    assert.equal(
      objects.length,
      9,
      'rejected uploads must clean up every object',
    )
    assert.equal(
      objects.reduce((sum, object) => sum + object.sizeBytes, 0),
      3 * 128 * 3,
    )
  })
  await bob.run(async () => {
    assert.equal((await loadImageStorageUsage()).totalBytes, 0)
    await assert.rejects(upload(item))
    assert.equal((await loadImageStorageUsage()).imageCount, 0)
  })
  await alice.run(async () => {
    await deleteEntityWithMedia('gear', item)
    assert.equal((await loadImageStorageUsage()).totalBytes, 0)
    assert.equal((await getStorage().listObjects(`gear/${item}/`)).length, 0)
  })

  const limit = 250 * 1024 * 1024
  await alice.run(async () => {
    const legacy = `beans/${alice.purchaseId}/legacy.webp`
    await db.insert(beanImages).values(
      journalInsertValues({
        beanId: alice.beanId,
        beanPurchaseId: alice.purchaseId,
        storagePath: legacy,
        sizeBytes: 10_000,
      }),
    )
    const paths = getStoredImagePaths([legacy])
    for (const path of paths)
      await getStorage().upload(new Blob(['12345']), path)
    assert.equal((await loadImageStorageUsage()).unmeasuredImages, 1)
    await measureLegacyImageStorage()
    assert.deepEqual(await loadImageStorageUsage(), {
      imageCount: 1,
      totalBytes: 15,
      unmeasuredImages: 0,
    })
    // Seed nearly-full storage with server-owned metadata; admission must be
    // atomic across distinct image tables and independent item IDs.
    await db
      .update(beanImages)
      .set({ storageBytes: limit - 600 })
      .where(owned(beanImages))
  })
  const otherItems = await alice.run(async () => [
    await createItem(),
    await createItem(),
  ])
  const quotaRace = await Promise.allSettled(
    otherItems.map((id) => alice.run(() => upload(id, 128))),
  )
  assert.equal(
    quotaRace.filter((result) => result.status === 'fulfilled').length,
    1,
  )
  await alice.run(async () => {
    assert.equal((await loadImageStorageUsage()).totalBytes, limit - 600 + 384)
    const [saved] = await db
      .select()
      .from(gearImages)
      .where(owned(gearImages))
      .limit(1)
    assert(saved)
    assert.equal(saved.sizeBytes, 128)
    assert.equal(saved.storageBytes, 384)
    assert.equal((await getStorage().stat(saved.storagePath))?.sizeBytes, 128)
    await deleteEntityWithMedia('gear', saved.gearId)
    const last = await createItem()
    await upload(last, 200) // exactly fills allowance including thumbnails
    assert.equal((await loadImageStorageUsage()).totalBytes, limit)
    await assert.rejects(upload(last, 1))
    assert.equal((await loadImageStorageUsage()).totalBytes, limit)
    const [old] = await db
      .select({ id: beanImages.id })
      .from(beanImages)
      .where(owned(beanImages))
      .limit(1)
    assert(old)
    await db
      .update(beanImages)
      .set({ storageBytes: null })
      .where(owned(beanImages, eq(beanImages.id, old.id)))
    await assert.rejects(
      upload(await createItem(), 1),
      'unmeasured images must fail closed',
    )
  })
}
