import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  gearImages,
  shotImages,
} from '../src/db/schema'
import { getSmallThumbnailPath, getThumbnailPath } from '../src/lib/image-path'
import {
  createSmallThumbnail,
  createThumbnail,
} from '../src/lib/thumbnail-image'

const STORAGE_BASE = process.env.STORAGE_PATH || './uploads'

async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function processOne(storagePath: string) {
  const fullOriginal = join(STORAGE_BASE, storagePath)
  const fullThumb = join(STORAGE_BASE, getThumbnailPath(storagePath))
  const fullSmallThumb = join(STORAGE_BASE, getSmallThumbnailPath(storagePath))

  const [hasThumb, hasSmallThumb] = await Promise.all([
    exists(fullThumb),
    exists(fullSmallThumb),
  ])
  if (hasThumb && hasSmallThumb) return { status: 'skip' as const }
  if (!(await exists(fullOriginal))) return { status: 'missing' as const }

  const input = await readFile(fullOriginal)
  const [thumb, smallThumb] = await Promise.all([
    hasThumb ? null : createThumbnail(input),
    hasSmallThumb ? null : createSmallThumbnail(input),
  ])
  await mkdir(dirname(fullThumb), { recursive: true })
  await Promise.all([
    thumb ? writeFile(fullThumb, thumb) : undefined,
    smallThumb ? writeFile(fullSmallThumb, smallThumb) : undefined,
  ])
  return {
    status: 'wrote' as const,
    bytes: (thumb?.length ?? 0) + (smallThumb?.length ?? 0),
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')
  const client = postgres(connectionString)
  const db = drizzle(client)

  const tables = [
    { name: 'beans', table: beanImages },
    { name: 'gear', table: gearImages },
    { name: 'coffee-shops', table: coffeeShopImages },
    { name: 'shots', table: shotImages },
    { name: 'visits', table: cafeVisitImages },
  ] as const

  const counts = { wrote: 0, skip: 0, missing: 0, failed: 0 }

  for (const { name, table } of tables) {
    const rows = await db.select({ storagePath: table.storagePath }).from(table)
    console.log(`[${name}] ${rows.length} rows`)
    for (const row of rows) {
      try {
        const result = await processOne(row.storagePath)
        counts[result.status]++
        if (result.status === 'wrote') {
          process.stdout.write(
            `  + ${row.storagePath} (${result.bytes} bytes)\n`,
          )
        } else if (result.status === 'missing') {
          process.stdout.write(`  ! missing: ${row.storagePath}\n`)
        }
      } catch (err) {
        counts.failed++
        console.error(`  x ${row.storagePath}`, err)
      }
    }
  }

  console.log('\nDone.', counts)
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
