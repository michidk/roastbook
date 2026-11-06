import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'

const migrationName = '0085_open-coffee-data.sql'

const sqlFile = async (filename: string) =>
  (await readFile(resolve('drizzle', filename), 'utf8')).replaceAll(
    '--> statement-breakpoint',
    '',
  )

describe('Open Coffee data migration', () => {
  let client: PGlite
  beforeAll(async () => {
    client = await PGlite.create('memory://')
    for (const filename of (await readdir(resolve('drizzle'))).sort()) {
      if (filename.endsWith('.sql') && filename < migrationName)
        await client.exec(await sqlFile(filename))
    }
    await client.exec(`
      INSERT INTO brews (brewing_method_id, distribution_method)
        SELECT id, unnest(ARRAY['WDT', 'Blind shaker', 'Finger distribution'])
        FROM brewing_methods WHERE name = 'Espresso';
      INSERT INTO recipes (name, brewing_method_id, distribution_method)
        SELECT 'Shaken', id, 'Stockfleth move' FROM brewing_methods WHERE name = 'Espresso';
      UPDATE brewing_methods SET enabled_parameters = ARRAY['doseGrams', 'shotTimeSeconds']
        WHERE name = 'AeroPress';
      UPDATE brewing_methods SET brew_method_id = 'chemex' WHERE name = 'Pour over';
    `)
    await client.exec(await sqlFile(migrationName))
  }, 30_000)
  afterAll(async () => {
    await client.close()
  })

  test('stores distribution methods as Open Coffee ids', async () => {
    const brews = await client.query<{ distribution_method: string }>(
      'SELECT distribution_method FROM brews ORDER BY id',
    )
    expect(brews.rows.map((row) => row.distribution_method)).toEqual([
      'wdt',
      'blind_shaker',
      'Finger distribution',
    ])
    const recipes = await client.query<{ distribution_method: string }>(
      'SELECT distribution_method FROM recipes',
    )
    expect(recipes.rows[0]?.distribution_method).toBe('stockfleth_move')
  })

  test('links default methods without replacing existing links', async () => {
    const methods = await client.query<{
      name: string
      brew_method_id: string | null
    }>('SELECT name, brew_method_id FROM brewing_methods')
    const linked = new Map(
      methods.rows.map((row) => [row.name, row.brew_method_id]),
    )
    expect(linked.get('Espresso')).toBe('espresso')
    expect(linked.get('Cold brew')).toBe('cold-brew')
    expect(linked.get('Pour over')).toBe('chemex')
  })

  test('enables new parameters only on untouched presets', async () => {
    const methods = await client.query<{
      name: string
      enabled_parameters: string[]
    }>('SELECT name, enabled_parameters FROM brewing_methods')
    for (const preset of DEFAULT_BREWING_METHODS.filter(
      (method) => method.name !== 'AeroPress',
    )) {
      expect(
        methods.rows
          .find((row) => row.name === preset.name)
          ?.enabled_parameters.sort(),
      ).toEqual([...preset.enabledParameters].sort())
    }
    expect(
      methods.rows.find((row) => row.name === 'AeroPress')?.enabled_parameters,
    ).toEqual(['doseGrams', 'shotTimeSeconds'])
  })
})
