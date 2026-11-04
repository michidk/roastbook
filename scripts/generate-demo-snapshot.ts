import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { getTableName } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '@/db/demo-seed.server'
import * as schema from '@/db/schema'
import { journalTables } from '@/journal/tables'

// PostgreSQL is used only to generate fixtures. No database engine is shipped.
const client = await PGlite.create('memory://')
try {
  for (const filename of (await readdir('drizzle'))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await client.exec(
      (await readFile(resolve('drizzle', filename), 'utf8')).replaceAll(
        '--> statement-breakpoint',
        '',
      ),
    )
  }
  const database = drizzle(client, { schema })
  await seedDemoDatabase(database)
  const tables = Object.fromEntries(
    await Promise.all(
      journalTables.map(async (table) => [
        getTableName(table),
        (await database.select().from(table)).map(
          ({ ownerId: _owner, ...row }) =>
            // Sample pictures are site assets, not the visitor's browser storage.
            'storageBytes' in row ? { ...row, storageBytes: 0 } : row,
        ),
      ]),
    ),
  )
  const directory = resolve(process.argv[2] ?? '.demo-build/client')
  await rm(directory, { recursive: true, force: true })
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, 'journal.json'),
    JSON.stringify({ tables }),
  )
} finally {
  await client.close()
}
