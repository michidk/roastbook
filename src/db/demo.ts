import { createServerOnlyFn } from '@tanstack/react-start'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'
import { gearName } from '@/lib/gear-name'
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

  const gearSeeds = [
    {
      brand: 'Arc & Ember',
      model: 'Aurora One',
      type: 'espresso_machine',
      purchasePrice: '3299.00',
    },
    {
      brand: 'Quiet Mechanics',
      model: 'Orbit Mill',
      type: 'grinder',
      purchasePrice: '629.00',
    },
    {
      brand: 'Northline Instruments',
      model: 'Mica Scale',
      type: 'scale',
      purchasePrice: '250.00',
    },
    {
      brand: 'Foundry Tools',
      model: 'Presswell 58.5',
      type: 'tamper',
      purchasePrice: '89.00',
    },
    {
      brand: 'Fieldwork Coffee',
      model: 'Cinder Hand Mill',
      type: 'grinder',
      purchasePrice: '219.00',
    },
    {
      brand: 'Hario',
      model: 'V60 02',
      type: 'brewer',
      purchasePrice: '24.00',
    },
    {
      brand: 'AeroPress',
      model: 'Clear',
      type: 'brewer',
      purchasePrice: '59.00',
    },
    {
      brand: 'Fellow',
      model: 'Stagg EKG',
      type: 'kettle',
      purchasePrice: '179.00',
    },
    {
      brand: 'Foundry Tools',
      model: 'High Flow 18g',
      type: 'basket',
      purchasePrice: '39.00',
    },
    {
      brand: 'Quiet Mechanics',
      model: 'Needle Nine WDT',
      type: 'wdt',
      purchasePrice: '32.00',
    },
  ] satisfies ReadonlyArray<Omit<typeof schema.gear.$inferInsert, 'name'>>
  const gear = await database
    .insert(schema.gear)
    .values(
      gearSeeds.map((item) => ({
        ...item,
        name: gearName(item.brand, item.model),
        priceCurrency: 'EUR',
      })),
    )
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
  const gearId = new Map(gear.map((item) => [item.model, item.id]))
  const insertedGearSets = await database
    .insert(schema.gearSets)
    .values([
      {
        name: 'Espresso bar',
        description: 'The complete setup for daily espresso dial-ins.',
        machineId: required(
          gearId.get('Aurora One'),
          'Espresso machine missing',
        ),
        grinderId: required(
          gearId.get('Orbit Mill'),
          'Espresso grinder missing',
        ),
        basketId: required(gearId.get('High Flow 18g'), 'Basket missing'),
      },
      {
        name: 'V60 bench',
        description: 'A bright pour-over setup for weekday brews.',
        machineId: required(gearId.get('V60 02'), 'V60 brewer missing'),
        grinderId: required(
          gearId.get('Cinder Hand Mill'),
          'Filter grinder missing',
        ),
      },
      {
        name: 'AeroPress travel',
        description: 'A compact setup for brewing away from home.',
        machineId: required(gearId.get('Clear'), 'AeroPress brewer missing'),
        grinderId: required(
          gearId.get('Cinder Hand Mill'),
          'Travel grinder missing',
        ),
      },
    ])
    .returning()
  const gearSetId = new Map(
    insertedGearSets.map((gearSet) => [gearSet.name, gearSet.id]),
  )
  await database.insert(schema.gearSetAccessoryGear).values([
    {
      gearSetId: required(gearSetId.get('Espresso bar'), 'Gear set missing'),
      gearId: required(gearId.get('Mica Scale'), 'Scale missing'),
    },
    {
      gearSetId: required(gearSetId.get('Espresso bar'), 'Gear set missing'),
      gearId: required(gearId.get('Presswell 58.5'), 'Tamper missing'),
    },
    {
      gearSetId: required(gearSetId.get('Espresso bar'), 'Gear set missing'),
      gearId: required(gearId.get('Needle Nine WDT'), 'WDT missing'),
    },
    {
      gearSetId: required(gearSetId.get('V60 bench'), 'Gear set missing'),
      gearId: required(gearId.get('Mica Scale'), 'Scale missing'),
    },
    {
      gearSetId: required(gearSetId.get('V60 bench'), 'Gear set missing'),
      gearId: required(gearId.get('Stagg EKG'), 'Kettle missing'),
    },
    {
      gearSetId: required(
        gearSetId.get('AeroPress travel'),
        'Gear set missing',
      ),
      gearId: required(gearId.get('Mica Scale'), 'Scale missing'),
    },
    {
      gearSetId: required(
        gearSetId.get('AeroPress travel'),
        'Gear set missing',
      ),
      gearId: required(gearId.get('Stagg EKG'), 'Kettle missing'),
    },
  ])
  const parameterHistory = [
    // Newest first. Each coffee follows a small dial-in story so its charts
    // show deliberate adjustments instead of repeating modulo patterns.
    [
      [18.2, 40.8, 12, 29, 93],
      [18.1, 40.2, 12, 28, 93],
      [18.1, 39.6, 11, 32, 93],
      [18.0, 39.2, 12, 27, 93],
      [18.0, 38.5, 12, 28, 92],
      [17.9, 38.1, 13, 26, 92],
      [18.0, 38.8, 12, 30, 92],
      [17.8, 37.4, 13, 25, 92],
      [17.9, 38.0, 13, 27, 92],
      [17.7, 36.8, 14, 24, 92],
    ],
    [
      [18.5, 42.0, 15, 31, 94],
      [18.5, 41.6, 15, 30, 94],
      [18.4, 40.8, 14, 34, 94],
      [18.4, 41.2, 15, 29, 93],
      [18.3, 40.4, 16, 26, 93],
      [18.3, 40.0, 16, 27, 93],
      [18.2, 39.2, 17, 24, 92],
      [18.2, 39.8, 16, 28, 92],
    ],
    [
      [16.0, null, 24, 165, 92],
      [16.0, null, 24, 168, 92],
      [15.8, null, 23, 178, 93],
      [15.8, null, 24, 170, 93],
      [15.5, null, 25, 158, 92],
      [15.5, null, 25, 155, 92],
      [15.0, null, 26, 148, 91],
    ],
    [
      [15.2, null, 28, 182, 95],
      [15.2, null, 28, 180, 95],
      [15.0, null, 27, 195, 95],
      [15.0, null, 28, 184, 94],
      [15.0, null, 29, 172, 94],
      [14.8, null, 30, 162, 93],
      [15.0, null, 29, 176, 94],
      [14.8, null, 31, 154, 93],
    ],
  ] as const
  const parameterOffsets = [0, 0, 0, 0]
  const tasteRatingHistory = [
    // balance, bitterness, acidity, sweetness, body, astringency
    [3, 2, 4, 4, 3, 1],
    [2, 2, 5, 3, 2, 2],
    [3, 3, 3, 4, 4, 2],
    [4, 4, 2, 3, 4, 3],
    [3, 2, 3, 5, 3, 1],
  ] as const
  const brewHistory = [
    // Recent brews are intentionally uneven: gaps, dial-in pairs, and weekends.
    [0, 7, 42, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [1, 7, 18, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [2, 15, 35, 'AeroPress', 2, 5, 'Clear', 'Cinder Hand Mill'],
    [3, 8, 5, 'Pour over', 3, 4, 'V60 02', 'Cinder Hand Mill'],
    [4, 7, 12, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [4, 7, 28, 'Espresso', 1, 4, 'Aurora One', 'Orbit Mill'],
    [5, 9, 5, 'Pour over', 3, 5, 'V60 02', 'Cinder Hand Mill'],
    [6, 16, 25, 'AeroPress', 2, 4, 'Clear', 'Cinder Hand Mill'],
    [7, 7, 44, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [8, 18, 20, 'AeroPress', 2, 4, 'Clear', 'Cinder Hand Mill'],
    [9, 7, 31, 'Espresso', 1, 2, 'Aurora One', 'Orbit Mill'],
    [9, 7, 48, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [10, 8, 10, 'Pour over', 3, 4, 'V60 02', 'Cinder Hand Mill'],
    [11, 7, 55, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [12, 7, 22, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [13, 14, 15, 'AeroPress', 2, 4, 'Clear', 'Cinder Hand Mill'],
    [14, 8, 2, 'Pour over', 3, 5, 'V60 02', 'Cinder Hand Mill'],
    [15, 7, 36, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [16, 10, 12, 'Pour over', 3, 4, 'V60 02', 'Cinder Hand Mill'],
    [17, 7, 17, 'Espresso', 0, 4, 'Aurora One', 'Orbit Mill'],
    [17, 7, 34, 'Espresso', 0, 5, 'Aurora One', 'Orbit Mill'],
    [18, 16, 40, 'AeroPress', 2, 3, 'Clear', 'Cinder Hand Mill'],
    [19, 8, 25, 'Pour over', 3, 4, 'V60 02', 'Cinder Hand Mill'],
    [20, 17, 10, 'AeroPress', 2, 5, 'Clear', 'Cinder Hand Mill'],
    [21, 7, 29, 'Espresso', 1, 3, 'Aurora One', 'Orbit Mill'],
    [22, 7, 51, 'Espresso', 1, 4, 'Aurora One', 'Orbit Mill'],
    [23, 13, 5, 'AeroPress', 2, 4, 'Clear', 'Cinder Hand Mill'],
    [24, 8, 14, 'Pour over', 3, 3, 'V60 02', 'Cinder Hand Mill'],
    [25, 7, 46, 'Espresso', 0, 3, 'Aurora One', 'Orbit Mill'],
    [26, 7, 8, 'Espresso', 0, 2, 'Aurora One', 'Orbit Mill'],
    [26, 7, 25, 'Espresso', 0, 3, 'Aurora One', 'Orbit Mill'],
    [27, 10, 30, 'Pour over', 3, 4, 'V60 02', 'Cinder Hand Mill'],
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
          const parameterIndex = required(
            parameterOffsets[beanIndex],
            'Brew parameter offset missing',
          )
          parameterOffsets[beanIndex] = parameterIndex + 1
          const [dose, brewYield, grind, brewTime, temperature] = required(
            parameterHistory[beanIndex]?.[parameterIndex],
            'Brew parameter history missing',
          )
          const [
            extractionBalance,
            bitterness,
            acidity,
            sweetness,
            body,
            astringency,
          ] = required(
            tasteRatingHistory[index % tasteRatingHistory.length],
            'Taste rating history missing',
          )
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
            doseGrams: dose.toFixed(1),
            brewWaterGrams: isEspresso
              ? null
              : String(method === 'AeroPress' ? 220 : 250),
            yieldGrams: brewYield?.toFixed(1) ?? null,
            grindSetting: String(grind),
            shotTimeSeconds: String(brewTime),
            brewTemperatureCelsius: String(temperature),
            rating,
            extractionBalance,
            bitterness,
            acidity,
            sweetness,
            body,
            astringency,
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
        accessories.push(required(gearId.get('Stagg EKG'), 'Kettle missing'))
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
