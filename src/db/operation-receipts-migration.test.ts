import { expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const migrationName = '0077_receipts_replace_operation_ids.sql'

test('operation ids earlier clients sent become receipts before they are dropped', async () => {
  const client = await PGlite.create('memory://')
  const directory = resolve('drizzle')
  const run = async (filename: string) =>
    client.exec(
      (await readFile(resolve(directory, filename), 'utf8')).replaceAll(
        '--> statement-breakpoint',
        '',
      ),
    )
  for (const filename of (await readdir(directory)).sort())
    if (filename.endsWith('.sql') && filename < migrationName)
      await run(filename)
  await client.exec(`
    INSERT INTO client_operations (operation_id) VALUES ('update-sent');
    INSERT INTO brews (brewing_method_id, client_operation_id)
      SELECT id, 'brew-sent' FROM brewing_methods LIMIT 1;
  `)
  await run(migrationName)
  const receipts = await client.query<{ command_id: string }>(
    'SELECT command_id FROM journal_command_receipts ORDER BY command_id',
  )
  expect(receipts.rows.map((row) => row.command_id)).toEqual([
    'brew-sent',
    'update-sent',
  ])
  await client.close()
  // Applies every migration to a fresh database first.
}, 30_000)
