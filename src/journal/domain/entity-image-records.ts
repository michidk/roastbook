import { and, count, eq, sql } from 'drizzle-orm'
import type { z } from 'zod'
import {
  beanImages,
  beanPurchases,
  cafeVisitImages,
  cafeVisits,
  coffeeShopImages,
  coffeeShops,
  gear,
  gearImages,
  shotImages,
  shots,
} from '@/db/schema'
import { db, owned, runJournalMutations } from '@/journal/platform/database'
import type {
  entityImageIdSchema,
  entityTypeSchema,
  thumbnailImageIdSchema,
} from '@/lib/server-validation'

type EntityType = z.infer<typeof entityTypeSchema>

export function entityImageTarget(entityType: EntityType) {
  switch (entityType) {
    case 'bean-purchases':
      return {
        table: beanImages,
        foreignKey: beanImages.beanPurchaseId,
        parent: beanPurchases,
        storageType: 'beans' as const,
      }
    case 'gear':
      return {
        table: gearImages,
        foreignKey: gearImages.gearId,
        parent: gear,
        storageType: 'gear' as const,
      }
    case 'coffee-shops':
      return {
        table: coffeeShopImages,
        foreignKey: coffeeShopImages.coffeeShopId,
        parent: coffeeShops,
        storageType: 'coffee-shops' as const,
      }
    case 'shots':
      return {
        table: shotImages,
        foreignKey: shotImages.shotId,
        parent: shots,
        storageType: 'shots' as const,
      }
    case 'visits':
      return {
        table: cafeVisitImages,
        foreignKey: cafeVisitImages.cafeVisitId,
        parent: cafeVisits,
        storageType: 'cafe-visits' as const,
      }
  }
}

export async function requireEntityImageCapacity(
  entityType: EntityType,
  entityId: number,
  maxImagesPerItem: number,
) {
  const { table, foreignKey, parent } = entityImageTarget(entityType)
  const [record] = await db
    .select({ id: parent.id })
    .from(parent)
    .where(owned(parent, eq(parent.id, entityId)))
    .limit(1)
  if (!record) throw new Error('Record not found')
  const [current] = await db
    .select({ images: count() })
    .from(table)
    .where(owned(table, eq(foreignKey, entityId)))
  if (Number(current?.images ?? 0) >= maxImagesPerItem)
    throw new Error(
      `Each item can have at most ${maxImagesPerItem} pictures. Remove a picture before adding another.`,
    )
}

export function entityImageSelection(
  data: z.infer<typeof entityImageIdSchema>,
) {
  const { table, foreignKey } = entityImageTarget(data.entityType)
  return {
    table,
    where: owned(
      table,
      and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)),
    ),
  }
}

export async function setEntityImageThumbnail(
  data: z.infer<typeof thumbnailImageIdSchema>,
) {
  const table = data.entityType === 'bean-purchases' ? beanImages : gearImages
  const foreignKey =
    data.entityType === 'bean-purchases'
      ? beanImages.beanPurchaseId
      : gearImages.gearId

  await runJournalMutations([
    {
      statement: db
        .update(table)
        .set({ isThumbnail: false })
        .where(owned(table, eq(foreignKey, data.entityId)))
        .getSQL(),
    },
    {
      statement: db
        .update(table)
        .set({ isThumbnail: true })
        .where(
          owned(
            table,
            and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage: 'Image not found',
    },
  ])
}

/** Keep an explicit choice, or select the oldest remaining picture. */
export function ensureEntityImageThumbnail(
  entityType: EntityType,
  entityId: number,
) {
  if (entityType !== 'bean-purchases' && entityType !== 'gear') return []
  const { table, foreignKey } = entityImageTarget(entityType)
  return [
    {
      statement: sql`update ${table} set is_thumbnail = true
      where ${owned(table, eq(foreignKey, entityId))}
        and id = (select id from ${table} where ${owned(table, eq(foreignKey, entityId))} order by created_at, id limit 1)
        and not exists (select 1 from ${table} where ${owned(table, eq(foreignKey, entityId))} and is_thumbnail = true)`,
    },
  ]
}
