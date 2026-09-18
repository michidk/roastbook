import { describe, expect, test } from 'bun:test'

const migrationPath = new URL(
  '../../drizzle/0049_great_rhino.sql',
  import.meta.url,
)

describe('bean purchase image migration', () => {
  test('backfills existing bean images before requiring a purchase', async () => {
    const migration = await Bun.file(migrationPath).text()
    const addNullable = migration.indexOf(
      'ADD COLUMN "bean_purchase_id" integer;',
    )
    const backfill = migration.indexOf('SET "bean_purchase_id" = "bean_id";')
    const requirePurchase = migration.indexOf(
      'ALTER COLUMN "bean_purchase_id" SET NOT NULL;',
    )
    const foreignKey = migration.indexOf('bean_images_purchase_bean_fk')

    expect(addNullable).toBeGreaterThan(-1)
    expect(backfill).toBeGreaterThan(addNullable)
    expect(requirePurchase).toBeGreaterThan(backfill)
    expect(foreignKey).toBeGreaterThan(requirePurchase)
  })

  test('scopes the thumbnail constraint to one image per bag', async () => {
    const migration = await Bun.file(migrationPath).text()

    expect(migration).toContain(
      'CREATE INDEX "bean_images_bean_purchase_id_idx"',
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "bean_images_one_thumbnail_idx" ON "bean_images" USING btree ("bean_purchase_id")',
    )
  })
})
