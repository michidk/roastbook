import { expect, test } from 'bun:test'

const integration = process.env.TEST_DATABASE_URL ? test : test.skip
integration.each([false, true])(
  'AI research and images preserve privacy with payload storage %s',
  (storePayloads) => {
    const result = Bun.spawnSync(['bun', 'run', 'scripts/test-ai-privacy.ts'], {
      env: {
        ...process.env,
        SSR: 'true',
        AI_TELEMETRY_STORE_PAYLOADS: String(storePayloads),
      },
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
