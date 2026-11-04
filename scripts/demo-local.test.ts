import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { journalStateSchema } from '@roastbook/journal-domain/state'
import { executeCommand } from '@/modules/journal/commands'
import { readJournal } from '@/modules/journal/reads'

test('generated fictional fixtures support the shared journal without a runtime SQL engine', async () => {
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
    const seed = journalStateSchema.parse(
      await Bun.file(join(directory, 'journal.json')).json(),
    )
    expect(seed.tables.beans.length).toBeGreaterThan(2)
    const result = executeCommand(seed, {
      id: crypto.randomUUID(),
      operation: 'beans/createBean',
      data: { name: 'Local sample', weight: '250' },
      createdAt: new Date().toISOString(),
      allocations: {},
    })
    expect(
      readJournal(result.state, 'beans/getBeanCollection', {
        query: 'Local sample',
      }),
    ).toHaveProperty('totalItems', 1)
    expect(seed.tables.beans).not.toContainEqual(
      expect.objectContaining({ name: 'Local sample' }),
    )
    expect(seed.pending).toEqual([])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
