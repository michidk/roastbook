import { and, eq } from 'drizzle-orm'
import {
  entityImageSelection,
  entityImageTarget,
} from '@/journal/domain/entity-image-records'
import type { EntityType } from '@/journal/images'
import { db, owned } from '@/journal/platform/database'

type ImageSelection = {
  entityType: EntityType
  entityId: number
  imageId: number
}

export async function loadEntityImage(data: ImageSelection) {
  const { table, where } = entityImageSelection(data)
  const [image] = await db.select().from(table).where(where).limit(1)
  if (!image) throw new Error('Image not found')
  return image
}

/** A copy, or a source that already has one, is not beautified again. */
export async function isBeautified(data: ImageSelection) {
  const image = await loadEntityImage(data)
  if (image.beautifiedFromImageId !== null) return { image, beautified: true }
  const { table, foreignKey } = entityImageTarget(data.entityType)
  const [copy] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      owned(
        table,
        and(
          eq(foreignKey, data.entityId),
          eq(table.beautifiedFromImageId, data.imageId),
        ),
      ),
    )
    .limit(1)
  return { image, beautified: copy !== undefined }
}
