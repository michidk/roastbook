import { afterAll, describe, expect, test } from 'bun:test'
import postgres from 'postgres'
import { DEFAULT_TASTE_PROFILE_FIELDS } from '@/lib/taste-profile'

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
  constraint?: string,
) {
  let error: unknown
  try {
    await operation()
  } catch (caught) {
    error = caught
  }

  expect(error).toBeDefined()
  expect((error as { code?: string }).code).toBe(code)
  if (constraint) {
    expect((error as { constraint_name?: string }).constraint_name).toBe(
      constraint,
    )
  }
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
          'shot_accessory_gear_shot_gear_idx',
          'recipe_accessory_gear_recipe_gear_idx',
          'bean_images_one_thumbnail_idx',
          'ai_request_logs_created_at_idx',
          'roasters_name_idx',
          'shots_recipe_id_idx'
        )
    `

    expect(migrations[0]?.count).toBeGreaterThanOrEqual(19)
    expect(indexes.map(({ indexname }) => indexname).sort()).toEqual([
      'ai_request_logs_created_at_idx',
      'bean_images_one_thumbnail_idx',
      'recipe_accessory_gear_recipe_gear_idx',
      'roasters_name_idx',
      'shot_accessory_gear_shot_gear_idx',
      'shot_taste_tags_shot_tag_idx',
      'shots_recipe_id_idx',
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

  test('sets the initial map location to Paris', async () => {
    const settings = await database()<
      [
        {
          defaultMapLatitude: number
          defaultMapLongitude: number
          defaultMapLabel: string
        },
      ]
    >`
      select
        default_map_latitude as "defaultMapLatitude",
        default_map_longitude as "defaultMapLongitude",
        default_map_label as "defaultMapLabel"
      from settings
      where id = 1
    `

    expect(settings[0]).toEqual({
      defaultMapLatitude: 48.8566,
      defaultMapLongitude: 2.3522,
      defaultMapLabel: 'Paris, France',
    })
  })

  test('starts the taste profile in detailed mode with every field on', async () => {
    const settings = await database()<[{ tasteProfileFields: string[] }]>`
      select taste_profile_fields as "tasteProfileFields"
      from settings
      where id = 1
    `
    expect(settings[0]?.tasteProfileFields).toEqual([
      ...DEFAULT_TASTE_PROFILE_FIELDS,
    ])
  })

  test('constrains the sour-to-bitter balance to the rating scale', async () => {
    await expectPostgresError(
      () => database()`update shots set extraction_balance = 6 where id = 1`,
      '23514',
      'shots_extraction_balance_check',
    )
  })

  test('defaults the shared appearance and list view', async () => {
    const settings = await database()<
      [{ backgroundTextureEnabled: boolean; defaultListView: string }]
    >`
      select
        background_texture_enabled as "backgroundTextureEnabled",
        default_list_view as "defaultListView"
      from settings
      where id = 1
    `
    expect(settings[0]?.backgroundTextureEnabled).toBe(true)
    expect(settings[0]?.defaultListView).toBe('cards')

    await expectPostgresError(
      () =>
        database()`update settings set default_list_view = 'grid' where id = 1`,
      '23514',
      'settings_list_view_check',
    )
  })

  test('stores valid AI usage and rejects negative token counts', async () => {
    const requestId = `ai-usage-${crypto.randomUUID()}`

    try {
      const [usage] = await database()<
        [{ totalTokens: number; estimatedCostUsd: string }]
      >`
        insert into ai_usage (
          request_id,
          feature,
          model,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          estimated_cost_usd
        ) values (${requestId}, 'test', 'gpt-4o', 100, 20, 120, 0.00045)
        returning
          total_tokens as "totalTokens",
          estimated_cost_usd as "estimatedCostUsd"
      `

      expect(usage).toEqual({
        totalTokens: 120,
        estimatedCostUsd: '0.0004500000',
      })
    } finally {
      await database()`delete from ai_usage where request_id = ${requestId}`
    }

    await expectPostgresError(
      () =>
        database()`
          insert into ai_usage (
            request_id,
            feature,
            model,
            prompt_tokens,
            completion_tokens,
            total_tokens
          ) values ('invalid-ai-usage', 'test', 'gpt-4o', -1, 0, 0)
        `,
      '23514',
    )
  })

  test('stores priced AI request logs and validates cached tokens', async () => {
    const requestType = `ai-request-${crypto.randomUUID()}`

    try {
      const [request] = await database()<
        [
          {
            cachedPromptTokens: number
            estimatedCostUsd: string
          },
        ]
      >`
        insert into ai_request_logs (
          request_type,
          model,
          request_payload,
          prompt_tokens,
          cached_prompt_tokens,
          completion_tokens,
          total_tokens,
          estimated_cost_usd
        ) values (${requestType}, 'gpt-4o', '{}', 100, 25, 20, 120, 0.00045)
        returning
          cached_prompt_tokens as "cachedPromptTokens",
          estimated_cost_usd as "estimatedCostUsd"
      `

      expect(request).toEqual({
        cachedPromptTokens: 25,
        estimatedCostUsd: '0.0004500000',
      })
    } finally {
      await database()`delete from ai_request_logs where request_type = ${requestType}`
    }

    await expectPostgresError(
      () =>
        database()`
          insert into ai_request_logs (
            request_type,
            model,
            request_payload,
            prompt_tokens,
            cached_prompt_tokens
          ) values ('invalid-cached-usage', 'gpt-4o', '{}', 1, 2)
        `,
      '23514',
    )
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

    await expectPostgresError(
      () =>
        database()`
          insert into ai_request_logs (
            request_type,
            model,
            status,
            request_payload
          ) values ('test', 'test-model', 'unknown', '{}')
        `,
      '23514',
    )
  })

  test('records brew time and clears deleted recipe attribution', async () => {
    await database().begin(async (transaction) => {
      const [method] = await transaction<[{ id: number }]>`
        insert into brewing_methods (name)
        values (${`stats-method-${crypto.randomUUID()}`}) returning id
      `
      const [recipe] = await transaction<[{ id: number }]>`
        insert into recipes (name, brewing_method_id)
        values (${`stats-recipe-${crypto.randomUUID()}`}, ${method.id}) returning id
      `
      const [shot] = await transaction<
        [{ id: number; brewed_at: Date; recipe_id: number | null }]
      >`
        insert into shots (brewing_method_id, recipe_id)
        values (${method.id}, ${recipe.id})
        returning id, brewed_at, recipe_id
      `

      expect(shot.brewed_at).toBeInstanceOf(Date)
      expect(shot.recipe_id).toBe(recipe.id)

      await transaction`delete from recipes where id = ${recipe.id}`
      const [updated] = await transaction<[{ recipe_id: number | null }]>`
        select recipe_id from shots where id = ${shot.id}
      `
      expect(updated.recipe_id).toBeNull()

      await transaction`delete from shots where id = ${shot.id}`
      await transaction`delete from brewing_methods where id = ${method.id}`
    })
  })

  test('removes accessory gear links with deleted gear', async () => {
    await database().begin(async (transaction) => {
      const [method] = await transaction<[{ id: number }]>`
        insert into brewing_methods (name)
        values (${`accessory-method-${crypto.randomUUID()}`}) returning id
      `
      const [shot] = await transaction<[{ id: number }]>`
        insert into shots (brewing_method_id)
        values (${method.id}) returning id
      `
      const [item] = await transaction<[{ id: number }]>`
        insert into gear (name, type)
        values (${`accessory-${crypto.randomUUID()}`}, 'other') returning id
      `

      await transaction`
        insert into shot_accessory_gear (shot_id, gear_id)
        values (${shot.id}, ${item.id})
      `
      await transaction`delete from gear where id = ${item.id}`
      const [remaining] = await transaction<[{ count: number }]>`
        select count(*)::int as count
        from shot_accessory_gear
        where shot_id = ${shot.id}
      `
      expect(remaining.count).toBe(0)
    })
  })

  test('defaults café lists to inactive', async () => {
    await database().begin(async (transaction) => {
      const [coffeeShop] = await transaction<
        [{ isFavorite: boolean; wantsToVisit: boolean }]
      >`
        insert into coffee_shops (name)
        values (${`lists-${crypto.randomUUID()}`})
        returning
          is_favorite as "isFavorite",
          wants_to_visit as "wantsToVisit"
      `

      expect(coffeeShop).toEqual({
        isFavorite: false,
        wantsToVisit: false,
      })
    })
  })
})
