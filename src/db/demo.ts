import { createServerOnlyFn } from '@tanstack/react-start'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'
import * as schema from './schema'

type Database = PgliteDatabase<typeof schema>

let instance: Database | undefined

if (import.meta.env.SSR) {
  const [{ readFile }, { PGlite }, { drizzle }] = await Promise.all([
    import('node:fs/promises'),
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ])
  const snapshot = await readFile(
    new URL(/* @vite-ignore */ '../_libs/demo-db.tar.gz', import.meta.url),
  )
  const client = await PGlite.create({
    dataDir: 'memory://',
    loadDataDir: new Blob([snapshot]),
  })
  instance = drizzle(client, { schema })
}

export const getDb = createServerOnlyFn((): Database => {
  if (!instance)
    throw new Error('Demo database is only available on the server')
  return instance
})

/**
 * Mirrors the `db` export of `@/db`, which `vite.config.ts` aliases to this
 * module for demo builds. Knip cannot follow that build-conditional alias.
 *
 * @public
 */
export const db = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDb(), property),
})

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

function daysAgoAt(days: number, hour: number, minute = 0): Date {
  const date = daysAgo(days)
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

export async function seedDemoDatabase(database: Database): Promise<void> {
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
      {
        name: 'Cinder Hand Mill',
        brand: 'Fieldwork Coffee',
        type: 'grinder',
        purchasePrice: '219.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Ridge V60 02',
        brand: 'Hario',
        type: 'brewer',
        purchasePrice: '24.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'AeroPress Clear',
        brand: 'AeroPress',
        type: 'brewer',
        purchasePrice: '59.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Fellow Stagg EKG',
        brand: 'Fellow',
        type: 'kettle',
        purchasePrice: '179.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'High Flow 18g',
        brand: 'Foundry Tools',
        type: 'basket',
        purchasePrice: '39.00',
        priceCurrency: 'EUR',
      },
      {
        name: 'Needle Nine WDT',
        brand: 'Quiet Mechanics',
        type: 'wdt',
        purchasePrice: '32.00',
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

  const activeBeans = beans.slice(0, 4)
  const gearId = new Map(gear.map((item) => [item.name, item.id]))
  const brewHistory = [
    // Recent brews are intentionally uneven: gaps, dial-in pairs, and weekends.
    [0, 7, 42, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [1, 7, 18, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [2, 15, 35, 'AeroPress', 2, 5, 'AeroPress Clear', 'Cinder Hand Mill'],
    [3, 8, 5, 'Pour over', 3, 4, 'Ridge V60 02', 'Cinder Hand Mill'],
    [4, 7, 12, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [4, 7, 28, 'Espresso', 1, 4, 'Aurora One', 'Orbit Mill'],
    [5, 9, 5, 'Pour over', 3, 5, 'Ridge V60 02', 'Cinder Hand Mill'],
    [6, 16, 25, 'AeroPress', 2, 4, 'AeroPress Clear', 'Cinder Hand Mill'],
    [7, 7, 44, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [8, 18, 20, 'AeroPress', 2, 4, 'AeroPress Clear', 'Cinder Hand Mill'],
    [9, 7, 31, 'Espresso', 1, 2, 'Aurora One', 'Orbit Mill'],
    [9, 7, 48, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [10, 8, 10, 'Pour over', 3, 4, 'Ridge V60 02', 'Cinder Hand Mill'],
    [11, 7, 55, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [12, 7, 22, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [13, 14, 15, 'AeroPress', 2, 4, 'AeroPress Clear', 'Cinder Hand Mill'],
    [14, 8, 2, 'Pour over', 3, 5, 'Ridge V60 02', 'Cinder Hand Mill'],
    [15, 7, 36, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [16, 10, 12, 'Pour over', 3, 4, 'Ridge V60 02', 'Cinder Hand Mill'],
    [17, 7, 17, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [17, 7, 34, 'Espresso', 0, 5, 'Aurora One', 'Orbit Mill'],
    [18, 16, 40, 'AeroPress', 2, 3, 'AeroPress Clear', 'Cinder Hand Mill'],
    [19, 8, 25, 'Pour over', 3, 4, 'Ridge V60 02', 'Cinder Hand Mill'],
    [20, 17, 10, 'AeroPress', 2, 5, 'AeroPress Clear', 'Cinder Hand Mill'],
    [21, 7, 29, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [22, 7, 51, 'Espresso', 1, 4, 'Aurora One', 'Orbit Mill'],
    [23, 13, 5, 'AeroPress', 2, 4, 'AeroPress Clear', 'Cinder Hand Mill'],
    [24, 8, 14, 'Pour over', 3, 3, 'Ridge V60 02', 'Cinder Hand Mill'],
    [25, 7, 46, 'Espresso', 0, 3, 'Aurora One', 'Orbit Mill'],
    [26, 7, 8, 'Espresso', 0, 2, 'Aurora One', 'Orbit Mill'],
    [26, 7, 25, 'Espresso', 0, 3, 'Aurora One', 'Orbit Mill'],
    [27, 10, 30, 'Pour over', 3, 4, 'Ridge V60 02', 'Cinder Hand Mill'],
    [29, 7, 40, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
  ] as const
  const shots = await database
    .insert(schema.shots)
    .values(
      brewHistory.map(
        (
          [day, hour, minute, method, beanIndex, rating, brewer, grinder],
          index,
        ) => {
          const isEspresso = method === 'Espresso'
          const brewedAt = daysAgoAt(day, hour, minute)
          return {
            beanId: required(activeBeans[beanIndex], 'Bean missing').id,
            machineId: required(gearId.get(brewer), 'Brewer missing'),
            grinderId: required(gearId.get(grinder), 'Grinder missing'),
            basketId: isEspresso
              ? required(gearId.get('High Flow 18g'), 'Basket missing')
              : null,
            brewingMethodId: required(
              methodId.get(method),
              `${method} method missing`,
            ),
            doseGrams: isEspresso
              ? (17.7 + (index % 4) * 0.2).toFixed(1)
              : (15 + (index % 3) * 0.5).toFixed(1),
            brewWaterGrams: isEspresso
              ? null
              : String(method === 'AeroPress' ? 220 : 250),
            yieldGrams: isEspresso ? (36 + (index % 6) * 0.8).toFixed(1) : null,
            shotTimeSeconds: String(
              isEspresso ? 25 + (index % 8) : 150 + (index % 5) * 12,
            ),
            brewTemperatureCelsius: String(isEspresso ? 93 : 92 + (index % 4)),
            rating,
            notes: [
              'Sweet, balanced, and easy to drink.',
              'A little sharp; adjusted the grind afterward.',
              'Juicy acidity with a clean finish.',
              'Good body, but slightly dry as it cooled.',
              'Best cup from this coffee so far.',
            ][index % 5],
            brewedAt,
            createdAt: brewedAt,
          }
        },
      ),
    )
    .returning()

  await database.insert(schema.shotAccessoryGear).values(
    shots.flatMap((shot, index) => {
      const accessories = [required(gearId.get('Mica Scale'), 'Scale missing')]
      if (brewHistory[index]?.[3] === 'Espresso') {
        accessories.push(
          required(gearId.get('Presswell 58.5'), 'Tamper missing'),
          required(gearId.get('Needle Nine WDT'), 'WDT missing'),
        )
      } else {
        accessories.push(
          required(gearId.get('Fellow Stagg EKG'), 'Kettle missing'),
        )
      }
      return accessories.map((accessoryGearId) => ({
        shotId: shot.id,
        gearId: accessoryGearId,
      }))
    }),
  )

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
