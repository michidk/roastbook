import { describe, expect, test } from 'bun:test'

describe('AI pricing sync', () => {
  test('validates the packaged models.dev snapshot without network access', () => {
    const result = Bun.spawnSync(
      ['bun', 'run', 'scripts/sync-ai-pricing.ts', '--check'],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    expect(result.exitCode).toBe(0)
    expect(new TextDecoder().decode(result.stdout)).toContain(
      'AI pricing table is up to date',
    )
  })
})
