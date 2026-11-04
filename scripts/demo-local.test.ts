import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getTableName } from 'drizzle-orm'
import { journalTables } from '@/journal/tables'

test('generated fictional fixtures cover every journal table', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-fixtures-'))
  try {
    const process = Bun.spawn(
      ['bun', 'scripts/generate-demo-snapshot.ts', directory],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, stderr] = await Promise.all([
      process.exited,
      new Response(process.stderr).text(),
    ])
    if (code !== 0) throw new Error(stderr)
    const { tables } = (await Bun.file(
      join(directory, 'journal.json'),
    ).json()) as {
      tables: Record<string, Array<Record<string, unknown>>>
    }
    expect(Object.keys(tables).sort()).toEqual(
      journalTables.map((table) => getTableName(table)).sort(),
    )
    expect(tables.beans?.length).toBeGreaterThan(2)
    expect(tables.settings).toHaveLength(1)
    // Sample pictures are site assets, not the visitor's browser storage.
    expect(tables.bean_images?.every((image) => image.storageBytes === 0)).toBe(
      true,
    )
    expect(
      Object.values(tables)
        .flat()
        .some((row) => 'ownerId' in row),
    ).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
