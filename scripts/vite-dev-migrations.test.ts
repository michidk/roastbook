import { describe, expect, test } from 'bun:test'
import { isMigrationManifestPath } from './vite-dev-migrations'

describe('development migration watcher', () => {
  test('recognizes generated SQL migrations and the Drizzle journal', () => {
    expect(isMigrationManifestPath('/app/drizzle/0021_example.sql')).toBe(true)
    expect(isMigrationManifestPath('drizzle/meta/_journal.json')).toBe(true)
    expect(isMigrationManifestPath('C:\\app\\drizzle\\0021_example.sql')).toBe(
      true,
    )
  })

  test('ignores snapshots and unrelated SQL files', () => {
    expect(isMigrationManifestPath('drizzle/meta/0021_snapshot.json')).toBe(
      false,
    )
    expect(isMigrationManifestPath('scripts/example.sql')).toBe(false)
  })
})
