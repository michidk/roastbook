import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '../src/db/demo'
import type * as schema from '../src/db/schema'
import { generateAndUploadThumbnail } from '../src/lib/server/thumbnails.server'
import { getStorage } from '../src/lib/storage'
import { client, db } from './database'

const DEMO_BEAN_PACKAGE_IMAGES = [
  'kraft-orange.webp',
  'forest-botanical.webp',
  'cobalt-sunburst.webp',
  'plum-orbit.webp',
  'teal-contours.webp',
] as const

async function installDemoBeanPackageImages(): Promise<void> {
  const storage = getStorage()

  for (const filename of DEMO_BEAN_PACKAGE_IMAGES) {
    const file = Bun.file(
      new URL(`seed-assets/bean-packaging/${filename}`, import.meta.url),
    )
    const storagePath = `demo/${filename}`
    const bytes = Buffer.from(await file.arrayBuffer())

    await storage.upload(file, storagePath)
    await generateAndUploadThumbnail(bytes, storagePath)
  }
}

async function seed(): Promise<void> {
  console.log('Seeding the canonical demo dataset...')

  try {
    // Both Drizzle drivers expose the query/insert surface used by the shared
    // fixture. Its declared PGlite type keeps the database-free demo build
    // independent from the PostgreSQL driver used by this command.
    await seedDemoDatabase(db as unknown as PgliteDatabase<typeof schema>)
    await installDemoBeanPackageImages()
    console.log('Canonical demo dataset seeded')
  } finally {
    await client.end()
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error)
  process.exitCode = 1
})
