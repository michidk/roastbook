import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { authUsers, gear, gearImages } from '@/db/schema'
import { createBean, getBean } from '@/journal/beans'
import { storeEntityImage } from '@/journal/domain/entity-image-store'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
} from '@/journal/domain/image-storage'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { deleteEntityImage, setImageAsThumbnail } from '@/journal/images'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const alice: JournalIdentity = {
  id: `images-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const bob: JournalIdentity = {
  ...alice,
  id: `images-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
}
const asAlice = <T>(work: () => Promise<T>) => withJournal(alice, work)
const asBob = <T>(work: () => Promise<T>) => withJournal(bob, work)
let itemId = 0
let input = Buffer.alloc(0)
async function item() {
  const [created] = await db
    .insert(gear)
    .values(
      journalInsertValues({
        name: `Camera ${randomUUID()}`,
        type: 'tamper' as const,
      }),
    )
    .returning()
  if (!created) throw new Error('No item')
  return created.id
}
function upload(id: number) {
  return storeEntityImage({
    entityType: 'gear',
    entityId: id,
    filename: 'photo.png',
    mimeType: 'image/png',
    binaryData: input,
  })
}

suite('journal image storage', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [alice, bob].map((identity) => ({
          id: identity.id,
          email: identity.email,
          emailVerified: true,
          journalInitializedAt: new Date(),
        })),
      )
    input = await sharp({
      create: { width: 2000, height: 1500, channels: 3, background: '#aabbcc' },
    })
      .png()
      .toBuffer()
    itemId = await asAlice(item)
  })
  afterAll(async () => {
    for (const identity of [alice, bob]) {
      await withJournal(identity, async () => {
        const items = await db
          .select({ id: gear.id })
          .from(gear)
          .where(owned(gear))
        for (const row of items) await deleteEntityWithMedia('gear', row.id)
      })
      await getControlDb()
        .delete(authUsers)
        .where(eq(authUsers.id, identity.id))
    }
  })
  test('stores and reports actual compressed files under the restricted journal role', async () => {
    await asAlice(async () => {
      const image = await upload(itemId)
      const objects = await Promise.all(
        getStoredImagePaths([image.storagePath]).map((path) =>
          getStorage().stat(path),
        ),
      )
      const total = objects.reduce(
        (sum, object) => sum + (object?.sizeBytes ?? 0),
        0,
      )
      expect(image.storageBytes).toBe(total)
      expect(total).toBeLessThan(input.byteLength)
      expect(await loadImageStorageUsage()).toEqual({
        imageCount: 1,
        totalBytes: total,
        unmeasuredImages: 0,
      })
    })
    await asBob(async () => {
      expect(await loadImageStorageUsage()).toEqual({
        imageCount: 0,
        totalBytes: 0,
        unmeasuredImages: 0,
      })
      await expect(upload(itemId)).rejects.toThrow('Record not found')
    })
  })
  test('serializes concurrent uploads and retains only three pictures', async () => {
    const uploads = await Promise.allSettled(
      Array.from({ length: 4 }, () => asAlice(() => upload(itemId))),
    )
    expect(
      uploads.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(2)
    await asAlice(async () => {
      expect((await loadImageStorageUsage()).imageCount).toBe(3)
      expect(await getStorage().listObjects(`gear/${itemId}`)).toHaveLength(9)
    })
  })
  test('rejects storage overflow before writing objects and frees allowance on deletion', async () => {
    await asAlice(async () => {
      const limit = imageStoragePolicy().limitBytes
      if (limit === null)
        throw new Error('Test requires IMAGE_STORAGE_LIMIT_MIB')
      const otherItem = await item()
      await db
        .update(gearImages)
        .set({ storageBytes: limit })
        .where(owned(gearImages))
      await expect(upload(otherItem)).rejects.toThrow('allowance is full')
      expect(await getStorage().listObjects(`gear/${otherItem}`)).toHaveLength(
        0,
      )
      await deleteEntityWithMedia('gear', itemId)
      expect((await loadImageStorageUsage()).totalBytes).toBe(0)
      await upload(otherItem)
      expect((await loadImageStorageUsage()).imageCount).toBe(1)
    })
  })
  test('stores, selects and deletes coffee pictures without requiring a bag', async () => {
    await asAlice(async () => {
      const bean = await createBean({
        data: { name: 'Café-only coffee', createBag: false },
      })
      try {
        const image = await storeEntityImage({
          entityType: 'beans',
          entityId: bean.id,
          filename: 'coffee.png',
          mimeType: 'image/png',
          binaryData: input,
        })
        await setImageAsThumbnail({
          data: { entityType: 'beans', entityId: bean.id, imageId: image.id },
        })
        const detail = await getBean({ data: bean.id })
        expect(detail?.purchases).toEqual([])
        expect(detail?.images[0]).toMatchObject({
          beanId: bean.id,
          beanPurchaseId: null,
          isThumbnail: true,
        })
        await deleteEntityImage({
          data: { entityType: 'beans', entityId: bean.id, imageId: image.id },
        })
        expect((await getBean({ data: bean.id }))?.images).toEqual([])
      } finally {
        await deleteEntityWithMedia('beans', bean.id)
      }
    })
  })
})
