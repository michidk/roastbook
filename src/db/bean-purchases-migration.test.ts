import { describe, expect, test } from 'bun:test'

const migrationPath = new URL(
  '../../drizzle/0048_high_arachne.sql',
  import.meta.url,
)

describe('repeat bean purchase migration', () => {
  test('backfills one deterministic bag per coffee and attributes old brews', async () => {
    const migration = await Bun.file(migrationPath).text()

    expect(migration).toContain('INSERT INTO "bean_purchases"')
    expect(migration).toContain('SELECT\n\t"id",\n\t"id"')
    expect(migration).toContain(
      'SET "bean_purchase_id" = "bean_id"\nWHERE "bean_id" is not null',
    )
    expect(migration).toContain(
      "pg_get_serial_sequence('bean_purchases', 'id')",
    )
  })

  test('adds consistency constraints before removing legacy bag columns', async () => {
    const migration = await Bun.file(migrationPath).text()
    const foreignKey = migration.indexOf('brews_purchase_bean_fk')
    const dropLegacy = migration.indexOf(
      'ALTER TABLE "beans" DROP COLUMN "roast_date"',
    )

    expect(foreignKey).toBeGreaterThan(-1)
    expect(dropLegacy).toBeGreaterThan(foreignKey)
    expect(migration).toContain('brews_purchase_requires_bean')
  })
})
