import { expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { demoJournalBuildPlugin } from './demo-local-build'

test('browser journal compilation rejects integration and private server dependencies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-demo-boundary-'))
  try {
    const entrypoint = join(directory, 'entry.ts')
    for (const dependency of [
      '@/lib/env.server',
      '@/db/connection.server',
      '@/lib/server/auth/account.server',
      '@/lib/server/remote-image.server',
      'node:fs',
      '@aws-sdk/client-s3',
      'better-auth',
    ]) {
      await writeFile(
        entrypoint,
        `import * as forbidden from ${JSON.stringify(dependency)}; globalThis.forbidden = forbidden`,
      )
      let failure: unknown
      try {
        await Bun.build({
          entrypoints: [entrypoint],
          target: 'browser',
          plugins: [demoJournalBuildPlugin('')],
        })
      } catch (error) {
        failure = error
      }
      expect(failure).toBeInstanceOf(AggregateError)
      if (!(failure instanceof AggregateError)) throw failure
      expect(failure.errors.map(String).join('\n')).toContain(
        'cannot enter browser demo',
      )
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
