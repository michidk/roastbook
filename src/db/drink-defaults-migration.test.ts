import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'

const migrationName = '0063_normalize_drink_and_method_defaults.sql'
// Parameters added to the presets by later migrations.
const laterParameters = new Set<string>([
  'steepTimeSeconds',
  'bloomWaterGrams',
  'pourCount',
])

describe('drink and brewing method defaults migration', () => {
  let client: PGlite
  let migration: string
  beforeAll(async () => {
    client = await PGlite.create('memory://')
    const directory = resolve('drizzle')
    for (const filename of (await readdir(directory)).sort()) {
      if (!filename.endsWith('.sql') || filename >= migrationName) continue
      await client.exec(
        (await readFile(resolve(directory, filename), 'utf8')).replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    }
    await client.exec(`
      INSERT INTO brews (brewing_method_id, drink_type_id)
        SELECT m.id, t.id FROM brewing_methods m, drink_types t
        WHERE m.name = 'Pour over' AND t.name = 'Pour Over';
      INSERT INTO recipes (name, brewing_method_id, drink_type_id)
        SELECT 'Existing filter recipe', m.id, t.id FROM brewing_methods m, drink_types t
        WHERE m.name = 'Pour over' AND t.name = 'Pour Over';
      INSERT INTO cafe_visits (drink_type_id)
        SELECT id FROM drink_types WHERE name = 'Pour Over';
      INSERT INTO drink_type_option_groups (drink_type_id, option_group_id)
        SELECT t.id, g.id FROM drink_types t, drink_option_groups g
        WHERE t.name = 'Pour Over' AND g.name = 'Milk';
      UPDATE brewing_methods SET enabled_parameters = ARRAY['doseGrams', 'shotTimeSeconds']
        WHERE name = 'AeroPress';
    `)
    migration = (
      await readFile(resolve(directory, migrationName), 'utf8')
    ).replaceAll('--> statement-breakpoint', '')
    await client.exec(migration)
  }, 20_000)
  afterAll(async () => {
    await client.close()
    process.exitCode = 0
  })

  test('merges drink references and option groups into Filter while preserving the method', async () => {
    expect(
      (
        await client.query(
          "SELECT id FROM drink_types WHERE name = 'Pour Over'",
        )
      ).rows,
    ).toEqual([])
    for (const table of ['brews', 'recipes', 'cafe_visits']) {
      const result = await client.query(
        `SELECT t.name FROM ${table} r JOIN drink_types t ON t.id = r.drink_type_id`,
      )
      expect(result.rows).toEqual([{ name: 'Filter' }])
    }
    expect(
      (
        await client.query(`SELECT g.name FROM drink_type_option_groups l
      JOIN drink_types t ON t.id = l.drink_type_id JOIN drink_option_groups g ON g.id = l.option_group_id
      WHERE t.name = 'Filter'`)
      ).rows,
    ).toEqual([{ name: 'Milk' }])
    expect(
      (
        await client.query(
          'SELECT m.name FROM brews b JOIN brewing_methods m ON m.id = b.brewing_method_id',
        )
      ).rows,
    ).toEqual([{ name: 'Pour over' }])
  })

  test('advances changed journal revisions and publishes the new recipe projection', async () => {
    expect((await client.query('SELECT revision FROM brews')).rows).toEqual([
      { revision: 1 },
    ])
    const result = await client.query<{
      entity: string
      document: { serverRevision: number; drinkTypeId: number }
    }>('SELECT entity, document FROM replication_changes')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.entity).toBe('recipes')
    expect(result.rows[0]?.document.serverRevision).toBe(1)
    const filter = await client.query<{ id: number }>(
      "SELECT id FROM drink_types WHERE name = 'Filter'",
    )
    expect(result.rows[0]?.document.drinkTypeId).toBe(filter.rows[0]?.id)
  })

  test('updates untouched presets and preserves customized field selections on repeated runs', async () => {
    await client.exec(migration)
    const methods = await client.query<{
      name: string
      enabled_parameters: string[]
    }>('SELECT name, enabled_parameters FROM brewing_methods')
    for (const method of DEFAULT_BREWING_METHODS.filter(
      (m) => m.name !== 'AeroPress',
    )) {
      expect(
        methods.rows
          .find((row) => row.name === method.name)
          ?.enabled_parameters.sort(),
      ).toEqual(
        method.enabledParameters
          .filter((key) => !laterParameters.has(key))
          .sort(),
      )
    }
    expect(
      methods.rows.find((row) => row.name === 'AeroPress')?.enabled_parameters,
    ).toEqual(['doseGrams', 'shotTimeSeconds'])
    expect(
      (await client.query('SELECT sequence FROM replication_changes')).rows,
    ).toHaveLength(1)
  })
})
