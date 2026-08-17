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
        [
          'Onyx Coffee Lab',
          'Rogers, Arkansas',
          'United States',
          'https://onyxcoffeelab.com',
        ],
        [
          'George Howell',
          'Boston, Massachusetts',
          'United States',
          'https://georgehowellcoffee.com',
        ],
        [
          'Counter Culture',
          'Durham, North Carolina',
          'United States',
          'https://counterculturecoffee.com',
        ],
        [
          'Square Mile',
          'London',
          'United Kingdom',
          'https://squaremilecoffee.com',
        ],
        ['The Barn', 'Berlin', 'Germany', 'https://thebarn.de'],
      ].map(([name, location, country, website]) => ({
        name: required(name, 'Roaster name missing'),
        location,
        country,
        website,
      })),
    )
    .returning()
  const roasterId = new Map(
    roasters.map((roaster) => [roaster.name, roaster.id]),
  )

  const beanFixtures = [
    [
      'Ethiopia Yirgacheffe Kochere',
      'Onyx Coffee Lab',
      'Ethiopia',
      'Yirgacheffe',
      'Washed',
      'light',
    ],
    [
      'Colombia Huila Pink Bourbon',
      'George Howell',
      'Colombia',
      'Huila',
      'Natural',
      'medium_light',
    ],
    [
      'Guatemala Antigua',
      'Counter Culture',
      'Guatemala',
      'Antigua',
      'Washed',
      'medium',
    ],
    ['Kenya Nyeri AA', 'Square Mile', 'Kenya', 'Nyeri', 'Washed', 'light'],
    [
      'Brazil Cerrado',
      'The Barn',
      'Brazil',
      'Cerrado Mineiro',
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
        name: 'Decent DE1PRO',
        brand: 'Decent Espresso',
        type: 'espresso_machine',
        purchasePrice: '3299.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Niche Zero',
        brand: 'Niche',
        type: 'grinder',
        purchasePrice: '629.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Acaia Lunar',
        brand: 'Acaia',
        type: 'scale',
        purchasePrice: '250.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Normcore V4',
        brand: 'Normcore',
        type: 'tamper',
        purchasePrice: '89.00',
        priceCurrency: 'EUR',
      },
    ])
    .returning()
  const beanId = new Map(beans.map((bean) => [bean.name, bean.id]))
  const recipes = [
    [
      'Daily Espresso',
      'Espresso',
      'Ethiopia Yirgacheffe Kochere',
      '18.0',
      '40.0',
    ],
    [
      'Sweet Pink Bourbon Espresso',
      'Espresso',
      'Colombia Huila Pink Bourbon',
      '18.5',
      '42.0',
    ],
    ['Bright V60', 'Pour over', 'Kenya Nyeri AA', '15.0', '215.0'],
    ['AeroPress Everyday', 'AeroPress', 'Guatemala Antigua', '16.0', '210.0'],
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
        name: 'The Barn',
        address: 'Auguststraße 58',
        city: 'Berlin',
        country: 'Germany',
        latitude: '52.5267',
        longitude: '13.3900',
        website: 'https://thebarn.de',
      },
      {
        name: 'Bonanza Coffee',
        address: 'Oderberger Str. 35',
        city: 'Berlin',
        country: 'Germany',
        latitude: '52.5387',
        longitude: '13.4099',
        website: 'https://bonanzacoffee.de',
      },
      {
        name: 'Tim Wendelboe',
        city: 'Oslo',
        country: 'Norway',
        latitude: '59.9225',
        longitude: '10.7580',
        website: 'https://timwendelboe.no',
      },
      {
        name: 'Prufrock Coffee',
        city: 'London',
        country: 'United Kingdom',
        latitude: '51.5195',
        longitude: '-0.1090',
        website: 'https://prufrockcoffee.com',
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
