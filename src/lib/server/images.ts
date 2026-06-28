import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import {
  beanImages,
  gearImages,
  placeImages,
  shotImages,
  cafeVisitImages,
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getStorage, generateStoragePath } from "@/lib/storage"
import { generateAndUploadThumbnail, getThumbnailPath } from "@/lib/server/thumbnails"

type EntityType = "beans" | "gear" | "places" | "shots" | "visits"
type ThumbnailEntityType = "beans" | "gear"

const storagePathTypeMap: Record<EntityType, "beans" | "gear" | "places" | "shots" | "cafe-visits"> = {
  beans: "beans",
  gear: "gear",
  places: "places",
  shots: "shots",
  visits: "cafe-visits",
}

export const uploadEntityImage = createServerFn({ method: "POST" })
  .validator(
    (data: {
      entityType: EntityType
      entityId: number
      fileBase64: string
      filename: string
      mimeType: string
      sizeBytes: number
    }) => data
  )
  .handler(async ({ data }) => {
    const storage = getStorage()
    const storagePathType = storagePathTypeMap[data.entityType]
    const storagePath = generateStoragePath(
      storagePathType,
      data.entityId,
      data.filename
    )

    const binaryData = Buffer.from(data.fileBase64, "base64")
    const blob = new Blob([binaryData], { type: data.mimeType })

    await storage.upload(blob, storagePath)
    await generateAndUploadThumbnail(binaryData, storagePath)

    const baseValues = {
      storagePath,
      originalFilename: data.filename,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    }

    let image: { id: number; storagePath: string }

    switch (data.entityType) {
      case "beans": {
        const [result] = await db
          .insert(beanImages)
          .values({ ...baseValues, beanId: data.entityId })
          .returning()
        image = result
        break
      }
      case "gear": {
        const [result] = await db
          .insert(gearImages)
          .values({ ...baseValues, gearId: data.entityId })
          .returning()
        image = result
        break
      }
      case "places": {
        const [result] = await db
          .insert(placeImages)
          .values({ ...baseValues, placeId: data.entityId })
          .returning()
        image = result
        break
      }
      case "shots": {
        const [result] = await db
          .insert(shotImages)
          .values({ ...baseValues, shotId: data.entityId })
          .returning()
        image = result
        break
      }
      case "visits": {
        const [result] = await db
          .insert(cafeVisitImages)
          .values({ ...baseValues, cafeVisitId: data.entityId })
          .returning()
        image = result
        break
      }
    }

    return {
      ...image,
      url: storage.getUrl(storagePath),
    }
  })



export const setImageAsThumbnail = createServerFn({ method: "POST" })
  .validator((data: { entityType: ThumbnailEntityType; entityId: number; imageId: number }) => data)
  .handler(async ({ data }) => {
    const table = data.entityType === "beans" ? beanImages : gearImages
    const foreignKey = data.entityType === "beans" ? beanImages.beanId : gearImages.gearId

    await db
      .update(table)
      .set({ isThumbnail: false })
      .where(eq(foreignKey, data.entityId))

    await db
      .update(table)
      .set({ isThumbnail: true })
      .where(and(eq(table.id, data.imageId), eq(foreignKey, data.entityId)))
  })

export const deleteEntityImage = createServerFn({ method: "POST" })
  .validator((data: { entityType: EntityType; imageId: number; storagePath: string }) => data)
  .handler(async ({ data }) => {
    const storage = getStorage()

    await storage.delete(data.storagePath)
    try {
      await storage.delete(getThumbnailPath(data.storagePath))
    } catch {
      // Thumbnail may not exist for older uploads — ignore.
    }

    switch (data.entityType) {
      case "beans":
        await db.delete(beanImages).where(eq(beanImages.id, data.imageId))
        break
      case "gear":
        await db.delete(gearImages).where(eq(gearImages.id, data.imageId))
        break
      case "places":
        await db.delete(placeImages).where(eq(placeImages.id, data.imageId))
        break
      case "shots":
        await db.delete(shotImages).where(eq(shotImages.id, data.imageId))
        break
      case "visits":
        await db.delete(cafeVisitImages).where(eq(cafeVisitImages.id, data.imageId))
        break
    }
  })
