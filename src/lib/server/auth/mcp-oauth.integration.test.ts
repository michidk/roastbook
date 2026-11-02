import { expect, test } from 'bun:test'

const integration = process.env.TEST_DATABASE_URL ? test : test.skip

integration(
  'MCP OAuth authorization, isolation, and revocation',
  () => {
    const result = Bun.spawnSync(['bun', 'run', 'scripts/test-mcp-oauth.ts'], {
      env: { ...process.env, SSR: 'true', AUTH_ENABLED: 'true' },
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
