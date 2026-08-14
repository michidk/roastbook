import { afterAll, describe, expect, test } from 'bun:test'
import postgres from 'postgres'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const sql = testDatabaseUrl ? postgres(testDatabaseUrl, { max: 1 }) : undefined
const databaseDescribe = testDatabaseUrl ? describe : describe.skip

function database() {
  if (!sql) throw new Error('TEST_DATABASE_URL is required')
  return sql
}

async function expectPostgresError(
  operation: () => Promise<unknown>,
  code: string,
) {
  let error: unknown
  try {
    await operation()
  } catch (caught) {
    error = caught
  }

  expect(error).toBeDefined()
  expect((error as { code?: string }).code).toBe(code)
}

afterAll(async () => {
  await sql?.end()
})

databaseDescribe('PostgreSQL schema', () => {
  test('has applied the complete migration chain', async () => {
    const migrations = await database()<[{ count: number }]>`
      select count(*)::int as count from drizzle.__drizzle_migrations
    `
    const indexes = await database()<[{ indexname: string }]>`
      select indexname from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'shot_taste_tags_shot_tag_idx',
          'bean_images_one_thumbnail_idx',
          'roasters_name_idx'
        )
    `

    expect(migrations[0]?.count).toBeGreaterThanOrEqual(19)
    expect(indexes.map(({ indexname }) => indexname).sort()).toEqual([
      'bean_images_one_thumbnail_idx',
      'roasters_name_idx',
      'shot_taste_tags_shot_tag_idx',
    ])
  })

  test('rolls back failed transactions', async () => {
    const name = `rollback-${crypto.randomUUID()}`

    await expect(
      database().begin(async (transaction) => {
        await transaction`insert into roasters (name) values (${name})`
        throw new Error('force rollback')
      }),
    ).rejects.toThrow('force rollback')

    const rows = await database()<[{ count: number }]>`
      select count(*)::int as count from roasters where name = ${name}
    `
    expect(rows[0]?.count).toBe(0)
  })

  test('cascades image metadata when a parent is deleted', async () => {
    await database().begin(async (transaction) => {
      const [bean] = await transaction<[{ id: number }]>`
        insert into beans (name) values (${`cascade-${crypto.randomUUID()}`})
        returning id
      `
      const [image] = await transaction<[{ id: number }]>`
        insert into bean_images (bean_id, storage_path)
        values (${bean.id}, ${`beans/${bean.id}/front.jpg`})
        returning id
      `

      await transaction`delete from beans where id = ${bean.id}`
      const remaining = await transaction<[{ count: number }]>`
        select count(*)::int as count from bean_images where id = ${image.id}
      `
      expect(remaining[0]?.count).toBe(0)
    })
  })

  test('enforces join and thumbnail uniqueness', async () => {
    await expectPostgresError(
      () =>
        database().begin(async (transaction) => {
          const [method] = await transaction<[{ id: number }]>`
            insert into brewing_methods (name)
            values (${`method-${crypto.randomUUID()}`}) returning id
          `
          const [shot] = await transaction<[{ id: number }]>`
            insert into shots (brewing_method_id)
            values (${method.id}) returning id
          `
          const [tag] = await transaction<[{ id: number }]>`
            insert into taste_tags (name)
            values (${`tag-${crypto.randomUUID()}`}) returning id
          `
          await transaction`
            insert into shot_taste_tags (shot_id, taste_tag_id)
            values (${shot.id}, ${tag.id}), (${shot.id}, ${tag.id})
          `
        }),
      '23505',
    )

    await expectPostgresError(
      () =>
        database().begin(async (transaction) => {
          const [bean] = await transaction<[{ id: number }]>`
            insert into beans (name)
            values (${`thumbnail-${crypto.randomUUID()}`}) returning id
          `
          await transaction`
            insert into bean_images (bean_id, storage_path, is_thumbnail)
            values
              (${bean.id}, ${`beans/${bean.id}/one.jpg`}, true),
              (${bean.id}, ${`beans/${bean.id}/two.jpg`}, true)
          `
        }),
      '23505',
    )
  })

  test('enforces bounded domain values', async () => {
    await expectPostgresError(
      () =>
        database()`
          insert into coffee_shops (name, rating)
          values (${`invalid-rating-${crypto.randomUUID()}`}, 6)
        `,
      '23514',
    )
  })
})
