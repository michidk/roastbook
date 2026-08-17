import { createServerOnlyFn } from '@tanstack/react-start'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'
import * as schema from './schema'

type Database = PgliteDatabase<typeof schema>

let instance: Database | undefined

if (import.meta.env.SSR) {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ])
  const client = new PGlite('memory://')

  const migrations = import.meta.glob('../../drizzle/*.sql', {
    eager: true,
    import: 'default',
    query: '?raw',
  }) as Record<string, string>

  for (const path of Object.keys(migrations).sort()) {
    const sql = migrations[path]
    if (sql) await client.exec(sql.replaceAll('--> statement-breakpoint', ''))
  }

  instance = drizzle(client, { schema })
  await seedDemoDatabase(instance)
}

export const getDb = createServerOnlyFn((): Database => {
  if (!instance)
    throw new Error('Demo database is only available on the server')
  return instance
})

export const db = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDb(), property),
})

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

async function seedDemoDatabase(database: Database): Promise<void> {
  await database
    .insert(schema.brewingMethods)
    .values(
      DEFAULT_BREWING_METHODS.map((method) => ({
        name: method.name,
        description: method.description,
        enabledParameters: [...method.enabledParameters],
        timerEnabled: method.timerEnabled,
      })),
    )
    .onConflictDoNothing()

  const methods = await database.query.brewingMethods.findMany()
  const methodId = new Map(methods.map((method) => [method.name, method.id]))

  const roasters = await database
    .insert(schema.roasters)
    .values(
      [
        ['Ember Atlas', 'Alderwick', 'Demo Republic'],
        ['Quiet Current', 'Lumen Bay', 'Sample Isles'],
        ['Juniper & Coil', 'Northmere', 'Demo Republic'],
        ['Northstar Roastworks', 'Bellweather', 'Sample Isles'],
        ['Paper Crane Coffee', 'Alderwick', 'Demo Republic'],
      ].map(([name, location, country]) => ({
        name: required(name, 'Roaster name missing'),
        location,
        country,
      })),
    )
    .returning()
  const roasterId = new Map(
    roasters.map((roaster) => [roaster.name, roaster.id]),
  )

  const beanFixtures = [
    [
      'Moonrise Lot 17',
      'Ember Atlas',
      'Luma Highlands',
      'Moonrise Valley',
      'Washed',
      'light',
    ],
    [
      'Coral Ridge Honey',
      'Quiet Current',
      'San Aurelio',
      'Coral Ridge',
      'Natural',
      'medium_light',
    ],
    [
      'Glasshouse Bloom',
      'Juniper & Coil',
      'Verdant Reach',
      'Glasshouse District',
      'Washed',
      'medium',
    ],
    [
      'Northwind Peaberry',
      'Northstar Roastworks',
      'Kisiwa Plateau',
      'Northwind Hills',
      'Washed',
      'light',
    ],
    [
      'Emberfield Reserve',
      'Paper Crane Coffee',
      'Serra Dourada',
      'Emberfield',
      'Pulped Natural',
      'medium_dark',
    ],
  ] as const
  const beans = await database
    .insert(schema.beans)
    .values(
      beanFixtures.map(
        ([name, roaster, origin, region, process, roastLevel], index) => ({
          name,
          roasterId: roasterId.get(roaster),
          origin,
          region,
          process,
          roastLevel,
          roastDate: daysAgo(7 + index * 4),
          notes:
            'A polished demo coffee with a clear, sweet specialty profile.',
          isArchived: index === 4,
        }),
      ),
    )
    .returning()

  const packageNames = [
    'kraft-orange.webp',
    'forest-botanical.webp',
    'cobalt-sunburst.webp',
    'plum-orbit.webp',
    'teal-contours.webp',
  ]
  await database.insert(schema.beanImages).values(
    beans.map((bean, index) => ({
      beanId: bean.id,
      storagePath: `demo/${packageNames[index % packageNames.length]}`,
      originalFilename: required(
        packageNames[index % packageNames.length],
        'Package image missing',
      ),
      mimeType: 'image/webp',
      sizeBytes: 1,
      isThumbnail: true,
    })),
  )

  const gear = await database
    .insert(schema.gear)
    .values([
      {
        name: 'Aurora One',
        brand: 'Arc & Ember',
        type: 'espresso_machine',
        purchasePrice: '3299.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Orbit Mill',
        brand: 'Quiet Mechanics',
        type: 'grinder',
        purchasePrice: '629.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Mica Scale',
        brand: 'Northline Instruments',
        type: 'scale',
        purchasePrice: '250.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Presswell 58.5',
        brand: 'Foundry Tools',
        type: 'tamper',
        purchasePrice: '89.00',
        priceCurrency: 'EUR',
      },
    ])
    .returning()
  const beanId = new Map(beans.map((bean) => [bean.name, bean.id]))
  const recipes = [
    ['Daily Espresso', 'Espresso', 'Moonrise Lot 17', '18.0', '40.0'],
    ['Coral Ridge Espresso', 'Espresso', 'Coral Ridge Honey', '18.5', '42.0'],
    ['Bright V60', 'Pour over', 'Northwind Peaberry', '15.0', '215.0'],
    ['AeroPress Everyday', 'AeroPress', 'Glasshouse Bloom', '16.0', '210.0'],
  ] as const
  await database.insert(schema.recipes).values(
    recipes.map(([name, method, bean, doseGrams, yieldGrams]) => ({
      name,
      brewingMethodId: required(
        methodId.get(method),
        `${method} method missing`,
      ),
      beanId: beanId.get(bean),
      doseGrams,
      yieldGrams,
      shotTimeSeconds: method === 'Espresso' ? '30' : '180',
      brewTemperatureCelsius: method === 'Espresso' ? '93.0' : '95.0',
    })),
  )

  const espressoId = required(
    methodId.get('Espresso'),
    'Espresso method missing',
  )
  const activeBeans = beans.slice(0, 4)
  const shots = await database
    .insert(schema.shots)
    .values(
      Array.from({ length: 25 }, (_, index) => ({
        beanId: required(
          activeBeans[index % activeBeans.length],
          'Bean missing',
        ).id,
        machineId: required(gear[0], 'Machine missing').id,
        grinderId: required(gear[1], 'Grinder missing').id,
        brewingMethodId: espressoId,
        doseGrams: (17.5 + (index % 4) * 0.2).toFixed(1),
        yieldGrams: (36 + (index % 5)).toFixed(1),
        shotTimeSeconds: String(26 + (index % 7)),
        rating: 3 + (index % 3),
        notes: ['Sweet and balanced.', 'Bright and juicy.', 'Syrupy finish.'][
          index % 3
        ],
        brewedAt: daysAgo(index),
        createdAt: daysAgo(index),
      })),
    )
    .returning()

  await database
    .insert(schema.tasteTags)
    .values([
      { name: 'Chocolate', category: 'Flavor' },
      { name: 'Fruity', category: 'Flavor' },
      { name: 'Floral', category: 'Flavor' },
      { name: 'Nutty', category: 'Flavor' },
    ])
    .onConflictDoNothing()
  const tags = await database.query.tasteTags.findMany({
    where: (tag, { inArray }) =>
      inArray(tag.name, ['Chocolate', 'Fruity', 'Floral', 'Nutty']),
  })
  await database.insert(schema.shotTasteTags).values(
    shots.map((shot, index) => ({
      shotId: shot.id,
      tasteTagId: required(tags[index % tags.length], 'Taste tag missing').id,
    })),
  )

  const shops = await database
    .insert(schema.coffeeShops)
    .values([
      {
        name: 'Lantern Room',
        address: '14 Passage Cuivré',
        city: 'Paris',
        country: 'France',
        latitude: '48.8644',
        longitude: '2.3547',
      },
      {
        name: 'Soft Current Café',
        address: '8 Rue du Courant Doux',
        city: 'Paris',
        country: 'France',
        latitude: '48.8531',
        longitude: '2.3692',
      },
      {
        name: 'Moss & Metric',
        address: '22 Galerie des Fougères',
        city: 'Paris',
        country: 'France',
        latitude: '48.8797',
        longitude: '2.3384',
      },
      {
        name: 'Daybreak Counter',
        address: '5 Allée de l’Aube',
        city: 'Paris',
        country: 'France',
        latitude: '48.8422',
        longitude: '2.3218',
      },
    ])
    .returning()
  await database.insert(schema.cafeVisits).values(
    Array.from({ length: 12 }, (_, index) => ({
      coffeeShopId: required(shops[index % shops.length], 'Coffee shop missing')
        .id,
      beanId:
        index % 3 === 0
          ? required(activeBeans[index % activeBeans.length], 'Bean missing').id
          : null,
      drinkName: ['Flat White', 'Espresso', 'Filter', 'Cappuccino'][index % 4],
      drinkType: ['milk', 'espresso', 'filter', 'milk'][index % 4],
      price: (3.5 + (index % 4) * 0.5).toFixed(2),
      currency: 'EUR',
      rating: 3 + (index % 3),
      visitedAt: daysAgo(index * 3),
    })),
  )
}
