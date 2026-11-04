import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { journalTableNames } from '@roastbook/journal-domain/model'
import { journalStateSchema } from '@roastbook/journal-domain/state'
import { drizzle } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '@/db/demo-seed.server'
import * as schema from '@/db/schema'

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
      journalTableNames.map(async (name) => [
        name,
        (await database.select().from(schema[name])).map(
          ({ ownerId: _owner, ...row }) => row,
        ),
      ]),
    ),
  )
  const state = journalStateSchema.parse({
    format: 1,
    revision: 0,
    serverRevision: 0,
    tables: JSON.parse(JSON.stringify(tables)),
    media: {},
    pending: [],
  })
  const directory = resolve(process.argv[2] ?? '.demo-build/client')
  await rm(directory, { recursive: true, force: true })
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'journal.json'), JSON.stringify(state))
} finally {
  await client.close()
}
