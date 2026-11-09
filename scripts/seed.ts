import { readdir } from 'node:fs/promises'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '../src/db/demo-seed.server'
import type * as schema from '../src/db/schema'
import { generateAndUploadThumbnail } from '../src/lib/server/thumbnails.server'
import { getStorage } from '../src/lib/storage'
import { client, db } from './database'

async function installDemoImages(): Promise<void> {
  const storage = getStorage()
  const gearImages = await readdir(new URL('seed-assets/gear', import.meta.url))
  const beanImages = await readdir(
    new URL('seed-assets/bean-packaging', import.meta.url),
  )

  for (const [source, storagePath] of [
    ...beanImages.map((filename): [string, string] => [
      `seed-assets/bean-packaging/${filename}`,
      `demo/${filename}`,
    ]),
    ...gearImages.map((filename): [string, string] => [
      `seed-assets/gear/${filename}`,
      `demo/gear/${filename}`,
    ]),
  ]) {
    const file = Bun.file(new URL(source, import.meta.url))
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
    await installDemoImages()
    console.log('Canonical demo dataset seeded')
  } finally {
    await client.end()
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error)
  process.exitCode = 1
})
