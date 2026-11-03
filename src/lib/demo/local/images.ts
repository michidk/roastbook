import { count, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '@/db/schema'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import {
  entityImageSelection,
  entityImageTarget,
  requireEntityImageCapacity,
  setEntityImageThumbnail,
} from '@/lib/server/entity-image-records.server'
import {
  entityImageIdSchema,
  type entityTypeSchema,
  thumbnailImageIdSchema,
  uploadEntityImageBase64Schema,
} from '@/lib/server-validation'
import { db } from './database'
import { createServerFn } from './function'
import { demoMedia } from './media'
import { allocateJournalIds, runJournalMutations } from './mutations'
import { owned } from './scope'

const MAX_IMAGES = 3
const MAX_STORED_BYTES = 50 * 1024 * 1024
export function imageStoragePolicy() {
  return { maxImagesPerItem: MAX_IMAGES, limitBytes: MAX_STORED_BYTES }
}

async function compress(file: Blob) {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      'This browser cannot decode this image. Choose a JPEG, PNG, or WebP picture.',
    )
  }
  try {
    if (
      bitmap.width > 12_000 ||
      bitmap.height > 12_000 ||
      bitmap.width * bitmap.height > 50_000_000
    )
      throw new Error('The image dimensions are unsupported')
    return await Promise.all(
      [
        { width: 1600, quality: 0.8 },
        { width: 640, quality: 0.78 },
        { width: 128, quality: 0.72 },
      ].map(async ({ width, quality }) => {
        const scale = Math.min(1, width / Math.max(bitmap.width, bitmap.height))
        const canvas = new OffscreenCanvas(
          Math.max(1, Math.round(bitmap.width * scale)),
          Math.max(1, Math.round(bitmap.height * scale)),
        )
        const context = canvas.getContext('2d')
        if (!context)
          throw new Error('Image processing is unavailable in this browser')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        return canvas.convertToBlob({ type: 'image/webp', quality })
      }),
    )
  } finally {
    bitmap.close()
  }
}

async function store(data: {
  entityType: z.infer<typeof entityTypeSchema>
  entityId: number
  filename: string
  file: Blob
}) {
  const { table, foreignKey } = entityImageTarget(data.entityType)
  await requireEntityImageCapacity(data.entityType, data.entityId, MAX_IMAGES)
  const files = await compress(data.file)
  const original = files[0]
  if (!original) throw new Error('Could not process the image')
  const bytes = files.reduce((total, file) => total + file.size, 0)
  if (
    [...demoMedia.values()].reduce((total, file) => total + file.size, 0) +
      bytes >
    MAX_STORED_BYTES
  )
    throw new Error(
      'This picture would exceed the demo’s 50 MiB browser image allowance. Remove pictures to free space.',
    )
  const path = `demo-local/${crypto.randomUUID()}.webp`
  const [id] = await allocateJournalIds(table)
  const beanColumn =
    data.entityType === 'bean-purchases' ? sql`, bean_id` : sql``
  const beanValue =
    data.entityType === 'bean-purchases'
      ? sql`, (select bean_id from bean_purchases where id = ${data.entityId} and owner_id = 'local')`
      : sql``
  await runJournalMutations([
    {
      statement: sql`insert into ${table} (id, owner_id, storage_path, original_filename, mime_type, size_bytes, storage_bytes, ${sql.identifier(foreignKey.name)}${beanColumn}) values (${id}, 'local', ${path}, ${data.filename}, ${original.type}, ${original.size}, ${bytes}, ${data.entityId}${beanValue})`,
    },
  ])
  const paths = [path, getThumbnailPath(path), getSmallThumbnailPath(path)]
  files.forEach((file, index) => {
    const key = paths[index]
    if (key) demoMedia.set(key, file)
  })
  const [image] = await db
    .select()
    .from(table)
    .where(owned(table, eq(table.id, id ?? 0)))
  return { ...image, url: path }
}

// FormData itself is not structured-cloneable. The client sends its entries.
export const uploadEntityImage = createServerFn({ method: 'POST' })
  .validator((entries: unknown) => {
    const values = z
      .array(z.tuple([z.string(), z.union([z.string(), z.instanceof(File)])]))
      .parse(entries)
    const form = new FormData()
    for (const [key, value] of values) form.set(key, value)
    return parseEntityImageUploadFormData(form)
  })
  .handler(({ data }) => store(data))

export const uploadEntityImageBase64 = createServerFn({ method: 'POST' })
  .validator(uploadEntityImageBase64Schema)
  .handler(({ data }) => {
    const bytes = Uint8Array.from(atob(data.fileBase64), (character) =>
      character.charCodeAt(0),
    )
    if (bytes.byteLength !== data.sizeBytes)
      throw new Error('Image size does not match the uploaded data')
    return store({ ...data, file: new Blob([bytes], { type: data.mimeType }) })
  })

export const deleteEntityImage = createServerFn({ method: 'POST' })
  .validator(entityImageIdSchema)
  .handler(async ({ data }) => {
    const { table, where } = entityImageSelection(data)
    const [image] = await db.select().from(table).where(where)
    if (!image) {
      if (data.idempotent) return
      throw new Error('Picture not found')
    }
    await db.delete(table).where(where)
    for (const path of [
      image.storagePath,
      getThumbnailPath(image.storagePath),
      getSmallThumbnailPath(image.storagePath),
    ])
      demoMedia.delete(path)
  })
export const setImageAsThumbnail = createServerFn({ method: 'POST' })
  .validator(thumbnailImageIdSchema)
  .handler(({ data }) => setEntityImageThumbnail(data))
export const getImageUploadPolicy = createServerFn({ method: 'GET' }).handler(
  imageStoragePolicy,
)

export const getInternalStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const groups = await Promise.all(
      [
        beanImages,
        gearImages,
        coffeeShopImages,
        shotImages,
        cafeVisitImages,
      ].map((table) =>
        db
          .select({
            images: count(),
            bytes: sql<number>`coalesce(sum(coalesce(${table.storageBytes}, ${table.sizeBytes}, 0)), 0)`,
          })
          .from(table)
          .where(owned(table)),
      ),
    )
    return {
      storage: {
        available: true,
        provider: 'local',
        imageCount: groups
          .flat()
          .reduce((total, group) => total + group.images, 0),
        totalBytes: groups
          .flat()
          .reduce((total, group) => total + Number(group.bytes), 0),
        unmeasuredImages: 0,
        ...imageStoragePolicy(),
      },
    }
  },
)
