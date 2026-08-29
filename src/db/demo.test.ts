import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { seedDemoDatabase } from '@/db/demo'
import * as schema from '@/db/schema'

describe('demo database', () => {
  let client: PGlite
  let database: PgliteDatabase<typeof schema>

  beforeAll(async () => {
    client = await PGlite.create('memory://')
    const migrationDirectory = resolve('drizzle')
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((filename) => filename.endsWith('.sql'))
      .sort()

    for (const filename of migrationFiles) {
      const sql = await readFile(resolve(migrationDirectory, filename), 'utf8')
      await client.exec(sql.replaceAll('--> statement-breakpoint', ''))
    }

    database = drizzle(client, { schema })
    await seedDemoDatabase(database)
  }, 15_000)

  afterAll(async () => {
    await client.close()
    // PGlite uses PostgreSQL's internal shutdown code after a clean close.
    process.exitCode = 0
  })

  test('includes reusable gear sets with their equipment', async () => {
    const gearSets = await database.query.gearSets.findMany({
      orderBy: (gearSet, { asc }) => [asc(gearSet.name)],
      with: {
        machine: true,
        grinder: true,
        basket: true,
        accessoryGearLinks: { with: { gear: true } },
      },
    })

    expect(
      gearSets.map((gearSet) => ({
        name: gearSet.name,
        machine: gearSet.machine?.model,
        grinder: gearSet.grinder?.model,
        basket: gearSet.basket?.model,
        accessories: gearSet.accessoryGearLinks
          .map(({ gear }) => gear.model)
          .sort(),
      })),
    ).toEqual([
      {
        name: 'AeroPress travel',
        machine: 'Clear',
        grinder: 'Cinder Hand Mill',
        basket: undefined,
        accessories: ['Mica Scale', 'Stagg EKG'],
      },
      {
        name: 'Espresso bar',
        machine: 'Aurora One',
        grinder: 'Orbit Mill',
        basket: 'High Flow 18g',
        accessories: ['Mica Scale', 'Needle Nine WDT', 'Presswell 58.5'],
      },
      {
        name: 'V60 bench',
        machine: 'V60 02',
        grinder: 'Cinder Hand Mill',
        basket: undefined,
        accessories: ['Mica Scale', 'Stagg EKG'],
      },
    ])
  })

  test('includes taste ratings for every brew', async () => {
    const brews = await database.query.shots.findMany({
      columns: {
        rating: true,
        extractionBalance: true,
        bitterness: true,
        acidity: true,
        sweetness: true,
        body: true,
        astringency: true,
      },
    })

    expect(brews.length).toBeGreaterThan(0)
    for (const brew of brews) {
      expect(Object.values(brew).every((value) => value !== null)).toBe(true)
    }
  })

  test('includes configurable drink types and milk choices', async () => {
    const milk = await database.query.drinkOptionGroups.findFirst({
      where: (group, { eq }) => eq(group.name, 'Milk'),
      with: { values: true, drinkTypeLinks: { with: { drinkType: true } } },
    })
    const visits = await database.query.cafeVisits.findMany({
      with: { drinkType: true },
    })

    expect(milk?.values).toHaveLength(7)
    expect(
      milk?.drinkTypeLinks.map((link) => link.drinkType.name).sort(),
    ).toEqual([
      'Cappuccino',
      'Cortado',
      'Flat White',
      'Latte',
      'Macchiato',
      'Mocha',
    ])
    expect(visits.every((visit) => visit.drinkType !== null)).toBe(true)
  })

  test('assigns drink types to the default brewing methods', async () => {
    const espresso = await database.query.brewingMethods.findFirst({
      where: (method, { eq }) => eq(method.name, 'Espresso'),
      with: { drinkTypeLinks: { with: { drinkType: true } } },
    })
    const coldBrew = await database.query.brewingMethods.findFirst({
      where: (method, { eq }) => eq(method.name, 'Cold brew'),
      with: { drinkTypeLinks: { with: { drinkType: true } } },
    })

    expect(
      espresso?.drinkTypeLinks.map((link) => link.drinkType.name),
    ).toContain('Latte')
    expect(
      coldBrew?.drinkTypeLinks.map((link) => link.drinkType.name).sort(),
    ).toEqual(['Cold Brew', 'Other'])
  })
})
