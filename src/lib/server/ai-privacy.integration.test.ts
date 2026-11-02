import { expect, test } from 'bun:test'

const integration = process.env.TEST_DATABASE_URL ? test : test.skip
integration(
  'AI research keeps private inputs, responses, and errors out of application logs',
  () => {
    const result = Bun.spawnSync(['bun', 'run', 'scripts/test-ai-privacy.ts'], {
      env: { ...process.env, SSR: 'true' },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 20_000,
    })
    if (result.exitCode !== 0)
      console.error(result.stdout.toString(), result.stderr.toString())
    expect(result.exitCode).toBe(0)
  },
  25_000,
)
