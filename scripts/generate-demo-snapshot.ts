import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '@/db/demo'
import * as schema from '@/db/schema'

const client = await PGlite.create('memory://')
const migrationDirectory = resolve('drizzle')
const migrationFiles = (await readdir(migrationDirectory))
  .filter((filename) => filename.endsWith('.sql'))
  .sort()

for (const filename of migrationFiles) {
  const sql = await readFile(resolve(migrationDirectory, filename), 'utf8')
  await client.exec(sql.replaceAll('--> statement-breakpoint', ''))
}

await seedDemoDatabase(drizzle(client, { schema }))

const snapshot = await client.dumpDataDir('gzip')
const outputDirectory = resolve('.demo-build')
await mkdir(outputDirectory, { recursive: true })
await writeFile(
  resolve(outputDirectory, 'demo-db.tar.gz'),
  new Uint8Array(await snapshot.arrayBuffer()),
)
await client.close()
// PGlite uses PostgreSQL's internal shutdown code even after a clean close.
process.exitCode = 0
