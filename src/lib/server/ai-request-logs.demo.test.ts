import { expect, test } from 'bun:test'

test('demo log retention skips production configuration and database writes', () => {
  const result = Bun.spawnSync(
    [
      process.execPath,
      '--define',
      '__ROASTBOOK_DEMO_MODE__=true',
      '-e',
      `const { scrubAiRequestPayloads } = await import('./src/lib/server/ai-request-logs.server')
       console.log(await scrubAiRequestPayloads())
       console.log(await scrubAiRequestPayloads({ force: true }))`,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: '' },
    },
  )

  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
  expect(result.stdout.toString()).toBe('0\n0\n')
})
