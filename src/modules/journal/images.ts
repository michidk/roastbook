import { z } from 'zod'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import {
  entityImageIdSchema,
  entityTypeSchema,
  imageBase64Schema,
  imageFilenameSchema,
  positiveIdSchema,
  thumbnailImageIdSchema,
} from '@/lib/server-validation'
import { type CommandContext, defineCommand } from './command-context'

export const imageTargets = {
  'bean-purchases': {
    table: 'beanImages',
    key: 'beanPurchaseId',
    parent: 'beanPurchases',
  },
  gear: { table: 'gearImages', key: 'gearId', parent: 'gear' },
  'coffee-shops': {
    table: 'coffeeShopImages',
    key: 'coffeeShopId',
    parent: 'coffeeShops',
  },
  shots: { table: 'shotImages', key: 'shotId', parent: 'shots' },
  visits: {
    table: 'cafeVisitImages',
    key: 'cafeVisitId',
    parent: 'cafeVisits',
  },
} as const
export const localImageUploadSchema = z.object({
  entityType: entityTypeSchema,
  entityId: positiveIdSchema,
  filename: imageFilenameSchema,
  files: z.array(imageBase64Schema).length(3),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
})
function selection(
  context: CommandContext,
  data: z.infer<typeof entityImageIdSchema>,
) {
  const target = imageTargets[data.entityType]
  const image = context.tx
    .rows(target.table)
    .find(
      (row) =>
        row.id === data.imageId &&
        Reflect.get(row, target.key) === data.entityId,
    )
  return { target, image }
}
export const imageCommands = {
  'images/uploadEntityImage': defineCommand(
    localImageUploadSchema,
    ({ tx, id, mediaNamespace, media, policy }, data) => {
      const target = imageTargets[data.entityType]
      const parent = tx.get(target.parent, data.entityId)
      if (
        tx
          .rows(target.table)
          .filter((row) => Reflect.get(row, target.key) === data.entityId)
          .length >= policy.maxImagesPerItem
      )
        throw new Error(
          `An item can have at most ${policy.maxImagesPerItem} pictures`,
        )
      const sizes = data.files.map((file) => atob(file).length)
      const sizeBytes = sizes[0] ?? 0
      const storageBytes = sizes.reduce((total, size) => total + size, 0)
      if (sizeBytes === 0) throw new Error('The picture is empty')
      if (
        policy.limitBytes !== null &&
        Object.values(imageTargets).some((target) =>
          tx.rows(target.table).some((image) => image.storageBytes === null),
        )
      )
        throw new Error(
          'Image storage is being measured. Reconnect and refresh, then try again.',
        )
      const used = Object.values(imageTargets).reduce(
        (total, target) =>
          total +
          tx
            .rows(target.table)
            .reduce(
              (sum, image) =>
                sum + (image.storageBytes ?? image.sizeBytes ?? 0),
              0,
            ),
        0,
      )
      if (policy.limitBytes !== null && used + storageBytes > policy.limitBytes)
        throw new Error(
          'This picture would exceed your image storage allowance. Remove pictures to free up space.',
        )
      const path = `journal/${mediaNamespace}/${id}-${data.digest}.webp`
      const paths = [path, getThumbnailPath(path), getSmallThumbnailPath(path)]
      data.files.forEach((file, index) => {
        const key = paths[index]
        if (key) media[key] = { mimeType: 'image/webp', data: file }
      })
      const beanId =
        data.entityType === 'bean-purchases' && 'beanId' in parent
          ? { beanId: parent.beanId }
          : {}
      const image = tx.insert(target.table, {
        [target.key]: data.entityId,
        ...beanId,
        storagePath: path,
        originalFilename: data.filename,
        mimeType: 'image/webp',
        sizeBytes,
        storageBytes,
      })
      return { ...image, url: path }
    },
  ),
  'images/deleteEntityImage': defineCommand(
    entityImageIdSchema,
    (context, data) => {
      const { target, image } = selection(context, data)
      if (!image) {
        if (data.idempotent) return
        throw new Error('Picture not found')
      }
      context.tx.delete(target.table, image.id)
    },
  ),
  'images/setImageAsThumbnail': defineCommand(
    thumbnailImageIdSchema,
    (context, data) => {
      const { target, image } = selection(context, data)
      if (!image) throw new Error('Image not found')
      for (const row of context.tx
        .rows(target.table)
        .filter((row) => Reflect.get(row, target.key) === data.entityId))
        context.tx.update(target.table, row.id, {
          isThumbnail: row.id === image.id,
        })
    },
  ),
}
