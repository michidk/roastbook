import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildDemoJournal, prepareDemoAssets } from './demo-local-build'

test('the compiled local journal preserves data, relations, derived reads and visitor isolation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-demo-test-'))
  try {
    const seed = Bun.spawn(
      [
        process.execPath,
        'scripts/generate-demo-snapshot.ts',
        join(directory, 'seed'),
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    expect(await seed.exited).toBe(0)
    const assets = join(directory, 'assets')
    await prepareDemoAssets({
      outdir: assets,
      snapshot: join(directory, 'seed/demo-db.tar.gz'),
    })
    await buildDemoJournal({
      entrypoint: 'scripts/test-demo-local.ts',
      target: 'bun',
      outdir: directory,
    })
    const result = Bun.spawn(
      [process.execPath, join(directory, 'test-demo-local.js'), assets],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, stdout, stderr] = await Promise.all([
      result.exited,
      new Response(result.stdout).text(),
      new Response(result.stderr).text(),
    ])
    expect(stderr).toBe('')
    expect(code).toBe(0)
    expect(stdout).toContain('integration restrictions passed')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90_000)
