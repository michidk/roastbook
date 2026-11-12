import { afterAll, beforeAll, expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'

type MigratedImage = {
  id: number
  storage_path: string
  original_storage_path: string | null
  storage_bytes: number | null
  beautified_at: Date | null
  is_thumbnail?: boolean
}
let client: PGlite
const tables = [
  ['bean_images', 'bean_purchase_id', true],
  ['gear_images', 'gear_id', true],
  ['coffee_shop_images', 'coffee_shop_id', false],
  ['brew_images', 'brew_id', false],
  ['cafe_visit_images', 'cafe_visit_id', false],
] as const

beforeAll(async () => {
  client = await PGlite.create('memory://')
  for (const [table, foreignKey, thumbnail] of tables) {
    await client.exec(`
      create table ${table} (
        id integer primary key, owner_id text not null,
        ${foreignKey} integer not null, created_at timestamp not null default now(),
        storage_path text not null, mime_type text, size_bytes integer,
        storage_bytes integer, beautified_from_image_id integer
        ${thumbnail ? ', is_thumbnail boolean not null default false' : ''}
      );
      ${thumbnail ? `create unique index ${table}_main on ${table}(owner_id, ${foreignKey}) where is_thumbnail;` : ''}
      insert into ${table} (id, owner_id, ${foreignKey}, storage_path, mime_type, size_bytes, storage_bytes, beautified_from_image_id${thumbnail ? ', is_thumbnail' : ''}) values
        (1, 'owner-a', 10, 'original.webp', 'image/webp', 100, 150, null${thumbnail ? ', false' : ''}),
        (2, 'owner-a', 10, 'edited.webp', 'image/webp', 200, 300, 1${thumbnail ? ', true' : ''}),
        (3, 'owner-a', 20, 'plain.webp', 'image/webp', 50, 80, null${thumbnail ? ', true' : ''}),
        (4, 'owner-b', 10, 'other-owner.webp', 'image/webp', 90, 110, 1${thumbnail ? ', true' : ''}),
        (5, 'owner-a', 30, 'orphan.webp', 'image/webp', 60, 70, 999${thumbnail ? ', true' : ''}),
        (6, 'owner-a', 40, 'unmeasured.webp', 'image/webp', 100, null, null${thumbnail ? ', true' : ''}),
        (7, 'owner-a', 40, 'unmeasured-edit.webp', 'image/webp', 100, 200, 6${thumbnail ? ', false' : ''});
    `)
  }
  const migration = await Bun.file('drizzle/0088_tiny_puck.sql').text()
  await client.exec(migration.replaceAll('--> statement-breakpoint', ''))
}, 20_000)

afterAll(async () => {
  await client?.close()
})

for (const [table, , thumbnail] of tables) {
  test(`${table} preserves the source ID, both files, and combined storage usage`, async () => {
    const { rows } = await client.query<MigratedImage>(
      `select * from ${table} where owner_id = 'owner-a' order by id`,
    )
    expect(rows.map((row) => row.id)).toEqual([1, 3, 5, 6])
    expect(rows[0]).toMatchObject({
      storage_path: 'edited.webp',
      original_storage_path: 'original.webp',
      original_size_bytes: 100,
      size_bytes: 200,
      storage_bytes: 450,
      original_storage_bytes: 150,
      original_mime_type: 'image/webp',
    })
    expect(rows[0]?.beautified_at).not.toBeNull()
    expect(rows[1]?.beautified_at).toBeNull()
    expect(rows[3]?.storage_bytes).toBeNull()
    if (thumbnail) {
      expect(rows[0]?.is_thumbnail).toBe(true)
      expect(rows[3]?.is_thumbnail).toBe(true)
    }
  })
  test(`${table} retains orphan edits and never pairs across owners`, async () => {
    const { rows } = await client.query<MigratedImage>(
      `select * from ${table} where id in (4,5) order by id`,
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.storage_path)).toEqual([
      'other-owner.webp',
      'orphan.webp',
    ])
    for (const row of rows) {
      expect(row.original_storage_path).toBeNull()
      expect(row.beautified_at).not.toBeNull()
    }
  })
}
