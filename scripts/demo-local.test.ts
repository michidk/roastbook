import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { journalStateSchema } from '@roastbook/journal-domain/state'
import { journalImageDigest } from '@/lib/journal-image-digest'
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
    // Sample pictures must not block uploads as unmeasured legacy storage.
    const files = ['YQ==', 'Yg==', 'Yw==']
    const purchase = seed.tables.beanPurchases[0]
    if (!purchase) throw new Error('Expected a sample purchase')
    const uploaded = executeCommand(seed, {
      id: crypto.randomUUID(),
      operation: 'images/uploadEntityImage',
      data: {
        entityType: 'bean-purchases',
        entityId: purchase.id,
        filename: 'bag.webp',
        files,
        digest: await journalImageDigest(files),
      },
      createdAt: new Date().toISOString(),
      allocations: {},
    })
    expect(Object.keys(uploaded.state.media)).toHaveLength(3)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
