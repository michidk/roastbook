import { expect, test } from 'bun:test'

const integration = process.env.TEST_DATABASE_URL ? test : test.skip
integration(
  'shared authentication contract on PostgreSQL',
  () => {
    const result = Bun.spawnSync(['bun', 'scripts/test-auth-contract.ts'], {
      env: { ...process.env, SSR: 'true' },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 90_000,
    })
    if (result.exitCode !== 0)
      console.error(result.stdout.toString(), result.stderr.toString())
    expect(result.exitCode).toBe(0)
  },
  95_000,
)
