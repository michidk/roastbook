import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import { authUsers, gear, gearImages } from '@/db/schema'
import { setEntityImageThumbnail } from '@/journal/domain/entity-image-records'
import { storeEntityImage } from '@/journal/domain/entity-image-store'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
} from '@/journal/domain/image-storage'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { loadAppSettings, updateSettings } from '@/journal/domain/settings'
import {
  deleteBeautifiedImage,
  deleteEntityImage,
  saveBeautifiedImage,
} from '@/journal/images'
import { getStoredImagePaths } from '@/lib/image-path'
import { prepareEntityImageBeautification } from '@/lib/server/image-beautification.server'
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
})

suite('beautified image storage', () => {
  let owner: JournalIdentity
  let stranger: JournalIdentity
  let pictureId = 0
  let gearId = 0
  let originalPath = ''
  let editPath = ''
  let editId = 0
  const scoped = <T>(work: () => Promise<T>) => withJournal(owner, work)
  beforeAll(async () => {
    owner = {
      ...alice,
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    }
    stranger = {
      ...bob,
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    }
    await getControlDb()
      .insert(authUsers)
      .values(
        [owner, stranger].map((identity) => ({
          id: identity.id,
          email: identity.email,
          emailVerified: true,
          journalInitializedAt: new Date(),
        })),
      )
    await scoped(async () => {
      gearId = await item()
      const picture = await storeEntityImage({
        entityType: 'gear',
        entityId: gearId,
        filename: 'original.png',
        mimeType: 'image/png',
        binaryData: input,
      })
      pictureId = picture.id
      originalPath = picture.storagePath
    })
  })
  afterAll(async () => {
    await scoped(() => deleteEntityWithMedia('gear', gearId))
    for (const identity of [owner, stranger])
      await getControlDb()
        .delete(authUsers)
        .where(eq(authUsers.id, identity.id))
  })
  const save = (imageId: number) =>
    saveBeautifiedImage({
      data: {
        entityType: 'gear',
        entityId: gearId,
        imageId,
        mimeType: 'image/png',
        imageBase64: input.toString('base64'),
      },
    })
  test('rejects another owner without touching the original', async () => {
    await expect(withJournal(stranger, () => save(pictureId))).rejects.toThrow(
      'Image not found',
    )
    expect(await getStorage().exists(originalPath)).toBe(true)
  })
  test('updates one picture, keeps its original, and prevents repeated edits', async () => {
    await scoped(async () => {
      const before = await loadImageStorageUsage()
      const edited = await save(pictureId)
      editPath = edited.storagePath
      editId = edited.id
      expect(edited.id).toBe(pictureId)
      expect(edited.originalStoragePath).toBe(originalPath)
      expect(edited.beautifiedAt).not.toBeNull()
      expect(editPath).not.toBe(originalPath)
      const rows = await db
        .select()
        .from(gearImages)
        .where(owned(gearImages, eq(gearImages.gearId, gearId)))
      expect(rows.map((row) => [row.id, row.isThumbnail])).toEqual([
        [pictureId, true],
      ])
      const objects = await Promise.all(
        getStoredImagePaths([originalPath, editPath]).map((path) =>
          getStorage().stat(path),
        ),
      )
      expect(objects.every(Boolean)).toBe(true)
      const usage = await loadImageStorageUsage()
      expect(usage.totalBytes).toBe(
        objects.reduce((sum, object) => sum + (object?.sizeBytes ?? 0), 0),
      )
      expect(usage.imageCount).toBe(before.imageCount)
      await expect(save(pictureId)).rejects.toThrow('already beautified')
      await expect(save(editId)).rejects.toThrow('already beautified')
    })
  })
  test('copies do not count toward the per-item picture limit', async () => {
    await scoped(async () => {
      const { maxImagesPerItem } = imageStoragePolicy()
      for (let index = 1; index < maxImagesPerItem; index++)
        await upload(gearId)
      await expect(upload(gearId)).rejects.toThrow('at most')
    })
  })
  test('removing only the edit restores the original and allows another edit', async () => {
    await scoped(async () => {
      const restored = await deleteBeautifiedImage({
        data: { entityType: 'gear', entityId: gearId, imageId: pictureId },
      })
      expect(restored.storagePath).toBe(originalPath)
      expect(restored.originalStoragePath).toBeNull()
      expect(restored.beautifiedAt).toBeNull()
      expect('isThumbnail' in restored && restored.isThumbnail).toBe(true)
      for (const path of getStoredImagePaths([editPath]))
        expect(await getStorage().exists(path)).toBe(false)
      for (const path of getStoredImagePaths([originalPath]))
        expect(await getStorage().exists(path)).toBe(true)
      const edited = await save(pictureId)
      editPath = edited.storagePath
      expect(edited.id).toBe(pictureId)
    })
  })
  test('deleting a picture cleans both original and edited files', async () => {
    await scoped(async () => {
      await deleteEntityImage({
        data: { entityType: 'gear', entityId: gearId, imageId: pictureId },
      })
      for (const path of getStoredImagePaths([originalPath, editPath]))
        expect(await getStorage().exists(path)).toBe(false)
    })
  })
})

suite('explicit image beautification', () => {
  const identity = {
    ...alice,
    id: randomUUID(),
    email: `${randomUUID()}@example.test`,
  }
  let id = 0
  let firstImage: Awaited<ReturnType<typeof upload>>
  let secondImage: Awaited<ReturnType<typeof upload>>
  let edits = 0
  const edit = async () => {
    edits++
    return { binaryData: input, mimeType: 'image/png' as const }
  }
  const scope = <T>(work: () => Promise<T>) => withJournal(identity, work)
  beforeAll(async () => {
    await getControlDb().insert(authUsers).values({
      id: identity.id,
      email: identity.email,
      emailVerified: true,
      journalInitializedAt: new Date(),
    })
    await scope(async () => {
      id = await item()
      firstImage = await upload(id)
      secondImage = await upload(id)
    })
  })
  afterAll(async () => {
    await scope(() => deleteEntityWithMedia('gear', id))
    await getControlDb().delete(authUsers).where(eq(authUsers.id, identity.id))
  })
  test('ignores legacy automatic requests even with the saved preference enabled', async () => {
    await scope(async () => {
      await updateSettings({ beautifyImages: true }, 'Failed to save')
      await setEntityImageThumbnail({
        entityType: 'gear',
        entityId: id,
        imageId: secondImage.id,
      })
      for (const image of [firstImage, secondImage]) {
        expect(
          await prepareEntityImageBeautification(
            {
              entityType: 'gear',
              entityId: id,
              imageId: image.id,
              automatic: true,
            },
            edit,
          ),
        ).toBeNull()
      }
      expect(edits).toBe(0)
      expect((await loadAppSettings()).beautifyImages).toBe(true)
    })
  })
  test('manual editing works with automatic beautification off and preserves state on provider failure', async () => {
    await scope(async () => {
      await updateSettings({ beautifyImages: false }, 'Failed to save')
      const manualItem = await item()
      const picture = await upload(manualItem)
      const data = {
        entityType: 'gear' as const,
        entityId: manualItem,
        imageId: picture.id,
        automatic: false,
      }
      await expect(
        prepareEntityImageBeautification(data, async () => {
          throw new Error('Provider unavailable')
        }),
      ).rejects.toThrow('Provider unavailable')
      const [record] = await db
        .select()
        .from(gearImages)
        .where(owned(gearImages, eq(gearImages.id, picture.id)))
      expect(record?.storagePath).toBe(picture.storagePath)
      const edited = await prepareEntityImageBeautification(data, edit)
      expect(edited?.id).toBe(picture.id)
      expect(edited?.originalStoragePath).toBe(picture.storagePath)
      const paths = getStoredImagePaths([
        picture.storagePath,
        edited?.storagePath ?? '',
      ])
      await deleteEntityWithMedia('gear', manualItem)
      for (const path of paths)
        expect(await getStorage().exists(path)).toBe(false)
    })
  })
  test('serializes simultaneous edits so a picture incurs one provider call', async () => {
    const concurrentItem = await scope(item)
    const picture = await scope(() => upload(concurrentItem))
    let calls = 0
    const data = {
      entityType: 'gear' as const,
      entityId: concurrentItem,
      imageId: picture.id,
      automatic: false,
    }
    const results = await Promise.all(
      [1, 2].map(() =>
        scope(() =>
          prepareEntityImageBeautification(data, async () => {
            calls++
            return { binaryData: input, mimeType: 'image/png' }
          }),
        ),
      ),
    )
    expect(calls).toBe(1)
    expect(results.filter(Boolean)).toHaveLength(1)
    await scope(() => deleteEntityWithMedia('gear', concurrentItem))
  })
  test('rejects quota overflow without changing the picture or leaving new objects', async () => {
    await scope(async () => {
      const quotaImage = await upload(id)
      const limit = imageStoragePolicy().limitBytes
      if (limit === null) throw new Error('Test requires quota')
      await db
        .update(gearImages)
        .set({ storageBytes: limit })
        .where(owned(gearImages, eq(gearImages.id, quotaImage.id)))
      const before = await getStorage().listObjects(`gear/${id}`)
      await expect(
        saveBeautifiedImage({
          data: {
            entityType: 'gear',
            entityId: id,
            imageId: quotaImage.id,
            imageBase64: input.toString('base64'),
            mimeType: 'image/png',
          },
        }),
      ).rejects.toThrow('storage allowance')
      expect(await getStorage().listObjects(`gear/${id}`)).toEqual(before)
      await expect(
        prepareEntityImageBeautification(
          {
            entityType: 'gear',
            entityId: id,
            imageId: quotaImage.id,
            automatic: false,
          },
          edit,
        ),
      ).rejects.toThrow('storage is full')
    })
  })
})
