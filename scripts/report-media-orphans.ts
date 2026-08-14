import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  mediaCleanupJobs,
  shotImages,
} from '../src/db/schema'
import { getThumbnailPath } from '../src/lib/image-path'
import { getStorage } from '../src/lib/storage'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const client = postgres(connectionString, { max: 1 })
const database = drizzle(client)

try {
  const imageSelections = await Promise.all([
    database.select({ storagePath: beanImages.storagePath }).from(beanImages),
    database.select({ storagePath: gearImages.storagePath }).from(gearImages),
    database
      .select({ storagePath: coffeeShopImages.storagePath })
      .from(coffeeShopImages),
    database.select({ storagePath: shotImages.storagePath }).from(shotImages),
    database
      .select({ storagePath: cafeVisitImages.storagePath })
      .from(cafeVisitImages),
  ])
  const cleanupJobs = await database
    .select({ storagePath: mediaCleanupJobs.storagePath })
    .from(mediaCleanupJobs)

  const originals = new Set(
    imageSelections.flat().map((image) => image.storagePath),
  )
  const thumbnails = new Set([...originals].map(getThumbnailPath))
  const referenced = new Set([...originals, ...thumbnails])
  const pendingCleanup = new Set(cleanupJobs.map((job) => job.storagePath))
  const stored = new Set(await getStorage().list())

  const missingOriginals = [...originals].filter((path) => !stored.has(path))
  const missingThumbnails = [...thumbnails].filter((path) => !stored.has(path))
  const orphanedObjects = [...stored].filter(
    (path) => !referenced.has(path) && !pendingCleanup.has(path),
  )
  const queuedObjects = [...pendingCleanup].filter((path) => stored.has(path))

  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        counts: {
          databaseImages: originals.size,
          storageObjects: stored.size,
          missingOriginals: missingOriginals.length,
          missingThumbnails: missingThumbnails.length,
          orphanedObjects: orphanedObjects.length,
          queuedObjects: queuedObjects.length,
        },
        missingOriginals,
        missingThumbnails,
        orphanedObjects,
        queuedObjects,
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}
