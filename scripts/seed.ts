import * as schema from '../src/db/schema'
import { DEFAULT_BREWING_METHODS } from '../src/lib/brewing-methods'
import { getFaviconStoragePath } from '../src/lib/favicon'
import { generateAndUploadThumbnail } from '../src/lib/server/thumbnails'
import { getStorage } from '../src/lib/storage'
import { client, db } from './database'
import { TASTE_TAGS } from './taste-tags'

const ROASTERS = [
  {
    name: 'Ember Atlas',
    location: 'Alderwick',
    country: 'Demo Republic',
    notes: 'Small-lot coffees with warm, fruit-forward profiles.',
  },
  {
    name: 'Quiet Current',
    location: 'Lumen Bay',
    country: 'Sample Isles',
    notes: 'Gentle roasting focused on sweetness and clarity.',
  },
  {
    name: 'Juniper & Coil',
    location: 'Northmere',
    country: 'Demo Republic',
    notes: 'Seasonal releases with botanical and chocolate notes.',
  },
  {
    name: 'Northstar Roastworks',
    location: 'Bellweather',
    country: 'Sample Isles',
    notes: 'Bright showcase roasts for filter and espresso.',
  },
  {
    name: 'Paper Crane Coffee',
    location: 'Alderwick',
    country: 'Demo Republic',
    notes: 'Comforting everyday coffees with a playful edge.',
  },
]

const BEANS = [
  {
    name: 'Moonrise Lot 17',
    roaster: 'Ember Atlas',
    origin: 'Luma Highlands',
    region: 'Moonrise Valley',
    farm: 'Lot Seventeen',
    variety: 'Aurora',
    process: 'Washed',
    roastLevel: 'light' as const,
    roastDate: daysAgo(14),
    notes: 'Bright and floral with citrus, jasmine, and a clean finish.',
  },
  {
    name: 'Coral Ridge Honey',
    roaster: 'Quiet Current',
    origin: 'San Aurelio',
    region: 'Coral Ridge',
    farm: 'Sunstep Garden',
    variety: 'Rosella',
    process: 'Honey',
    roastLevel: 'medium_light' as const,
    roastDate: daysAgo(10),
    notes: 'Jammy berry sweetness with a soft cocoa finish.',
  },
  {
    name: 'Glasshouse Bloom',
    roaster: 'Juniper & Coil',
    origin: 'Verdant Reach',
    region: 'Glasshouse District',
    farm: 'Canopy Station',
    variety: 'Canopy',
    process: 'Washed',
    roastLevel: 'medium' as const,
    roastDate: daysAgo(21),
    notes: 'Balanced milk chocolate, orange, and brown sugar notes.',
  },
  {
    name: 'Northwind Peaberry',
    roaster: 'Northstar Roastworks',
    origin: 'Kisiwa Plateau',
    region: 'Northwind Hills',
    variety: 'Peaberry',
    process: 'Washed',
    roastLevel: 'light' as const,
    roastDate: daysAgo(7),
    notes: 'Blackcurrant sweetness with sparkling acidity.',
  },
  {
    name: 'Emberfield Reserve',
    roaster: 'Paper Crane Coffee',
    origin: 'Serra Dourada',
    region: 'Emberfield',
    variety: 'Golden Ember',
    process: 'Pulped Natural',
    roastLevel: 'medium_dark' as const,
    roastDate: daysAgo(30),
    notes: 'Low acidity and a heavy body with dark chocolate and molasses.',
    isArchived: true,
  },
]

const BEAN_PACKAGE_IMAGES = [
  'kraft-orange.webp',
  'forest-botanical.webp',
  'cobalt-sunburst.webp',
  'plum-orbit.webp',
  'teal-contours.webp',
] as const

const FAVICON_IMAGES = [
  'terracotta-wave.png',
  'cobalt-arches.png',
  'forest-diamond.png',
  'plum-crescent.png',
  'coral-pinwheel.png',
] as const

const GEAR = [
  {
    name: 'Aurora One',
    brand: 'Arc & Ember',
    model: 'A1',
    type: 'espresso_machine' as const,
    purchaseDate: daysAgo(365),
    purchasePrice: '3299.00',
    priceCurrency: 'EUR',
    notes: 'A fictional pressure-profiling espresso machine.',
  },
  {
    name: 'Orbit Mill',
    brand: 'Quiet Mechanics',
    model: 'OM-1',
    type: 'grinder' as const,
    purchaseDate: daysAgo(400),
    purchasePrice: '629.00',
    priceCurrency: 'EUR',
    notes: 'A fictional single-dose grinder with conical burrs.',
  },
  {
    name: 'Mica Scale',
    brand: 'Northline Instruments',
    model: 'Mica',
    type: 'scale' as const,
    purchaseDate: daysAgo(500),
    purchasePrice: '250.00',
    priceCurrency: 'EUR',
    notes: 'Compact fictional scale with 0.1g precision.',
  },
  {
    name: 'Presswell 58.5',
    brand: 'Foundry Tools',
    model: 'PW-58',
    type: 'tamper' as const,
    purchaseDate: daysAgo(300),
    purchasePrice: '89.00',
    priceCurrency: 'EUR',
    notes: 'Spring-loaded fictional tamper.',
  },
  {
    name: 'Needle Array',
    brand: 'Field Notes',
    model: 'NA-4',
    type: 'wdt' as const,
    purchasePrice: '15.00',
    priceCurrency: 'EUR',
    notes: 'A fictional fine-needle distribution tool.',
  },
  {
    name: 'Harbor Mill',
    brand: 'Sample Workshop',
    model: 'HM-2',
    type: 'grinder' as const,
    purchaseDate: daysAgo(1500),
    purchasePrice: '139.00',
    priceCurrency: 'EUR',
    notes: 'Retired fictional entry-level grinder.',
    isArchived: true,
  },
]

const RECIPES = [
  {
    name: 'Daily Espresso',
    brewingMethod: 'Espresso',
    bean: 'Moonrise Lot 17',
    doseGrams: '18.0',
    yieldGrams: '40.0',
    shotTimeSeconds: '29',
    grindSetting: '15',
    brewTemperatureCelsius: '93.0',
    brewPressureBar: '9.0',
    preinfusionTimeSeconds: '6',
  },
  {
    name: 'Coral Ridge Espresso',
    brewingMethod: 'Espresso',
    bean: 'Coral Ridge Honey',
    doseGrams: '18.5',
    yieldGrams: '42.0',
    shotTimeSeconds: '31',
    grindSetting: '14',
    brewTemperatureCelsius: '94.0',
    brewPressureBar: '9.0',
    preinfusionTimeSeconds: '7',
  },
  {
    name: 'Bright V60',
    brewingMethod: 'Pour over',
    bean: 'Northwind Peaberry',
    doseGrams: '15.0',
    brewWaterGrams: '250.0',
    ratioBasis: 'brew_water' as const,
    yieldGrams: '215.0',
    shotTimeSeconds: '180',
    grindSetting: '28',
    brewTemperatureCelsius: '96.0',
    bloomTimeSeconds: '45',
  },
  {
    name: 'AeroPress Everyday',
    brewingMethod: 'AeroPress',
    bean: 'Glasshouse Bloom',
    doseGrams: '16.0',
    brewWaterGrams: '240.0',
    ratioBasis: 'brew_water' as const,
    yieldGrams: '210.0',
    shotTimeSeconds: '120',
    grindSetting: '22',
    brewTemperatureCelsius: '90.0',
    bloomTimeSeconds: '30',
    paperFilterPosition: 'bottom' as const,
  },
] as const

const COFFEE_SHOPS = [
  {
    name: 'Lantern Room',
    address: '14 Passage Cuivré',
    city: 'Paris',
    country: 'France',
    latitude: '48.8644',
    longitude: '2.3547',
    notes: 'A cozy fictional café with rotating filter coffees.',
  },
  {
    name: 'Soft Current Café',
    address: '8 Rue du Courant Doux',
    city: 'Paris',
    country: 'France',
    latitude: '48.8531',
    longitude: '2.3692',
    notes: 'A bright fictional counter focused on gentle espresso.',
  },
  {
    name: 'Moss & Metric',
    address: '22 Galerie des Fougères',
    city: 'Paris',
    country: 'France',
    latitude: '48.8797',
    longitude: '2.3384',
    notes: 'A fictional plant-filled café with precise brews.',
  },
  {
    name: 'Daybreak Counter',
    address: '5 Allée de l’Aube',
    city: 'Paris',
    country: 'France',
    latitude: '48.8422',
    longitude: '2.3218',
    notes: 'A fictional morning bar for quick espresso and pastries.',
  },
]

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  const element = arr[Math.floor(Math.random() * arr.length)]
  if (element === undefined) {
    throw new Error('Cannot select a random element from an empty array')
  }
  return element
}

function randomSubset<T>(items: readonly T[], min: number, max: number): T[] {
  const count = randomInt(min, max)
  return [...items].sort(() => Math.random() - 0.5).slice(0, count)
}

async function uploadSeedFavicons(
  storage: ReturnType<typeof getStorage>,
  entityType: 'coffee-shops' | 'roasters',
  entities: ReadonlyArray<{ id: number }>,
) {
  for (const [index, entity] of entities.entries()) {
    const filename = FAVICON_IMAGES[index % FAVICON_IMAGES.length]
    if (!filename) throw new Error('Favicon seed image is missing')

    const file = Bun.file(
      new URL(`seed-assets/demo-favicons/${filename}`, import.meta.url),
    )
    await storage.upload(file, getFaviconStoragePath(entityType, entity.id))
  }
}

async function seed() {
  console.log('🌱 Seeding database...')
  const storage = getStorage()

  console.log('  → Inserting brewing methods...')
  await db
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
  const allBrewingMethods = await db.query.brewingMethods.findMany()
  const brewingMethodMap = new Map(
    allBrewingMethods.map((method) => [method.name, method.id]),
  )
  const espressoMethod = allBrewingMethods.find(
    (method) => method.name === 'Espresso',
  )
  if (!espressoMethod) throw new Error('Espresso brewing method is missing')

  console.log('  → Inserting taste tags...')
  const insertedTags = await db
    .insert(schema.tasteTags)
    .values([...TASTE_TAGS])
    .onConflictDoNothing()
    .returning()
  console.log(`    ✓ ${insertedTags.length} taste tags`)

  const allTags = await db.query.tasteTags.findMany()

  console.log('  → Inserting roasters...')
  const insertedRoasters = await db
    .insert(schema.roasters)
    .values(ROASTERS)
    .returning()
  console.log(`    ✓ ${insertedRoasters.length} roasters`)

  console.log('  → Uploading synthetic roaster favicons...')
  await uploadSeedFavicons(storage, 'roasters', insertedRoasters)
  console.log(`    ✓ ${insertedRoasters.length} roaster favicons`)

  const roasterMap = new Map(insertedRoasters.map((r) => [r.name, r.id]))

  console.log('  → Inserting beans...')
  const beansWithRoasterIds = BEANS.map((bean) => ({
    ...bean,
    roasterId: bean.roaster ? (roasterMap.get(bean.roaster) ?? null) : null,
  }))
  const insertedBeans = await db
    .insert(schema.beans)
    .values(beansWithRoasterIds)
    .returning()
  console.log(`    ✓ ${insertedBeans.length} beans`)

  console.log('  → Uploading bean package images...')
  for (const [index, bean] of insertedBeans.entries()) {
    const filename = BEAN_PACKAGE_IMAGES[index % BEAN_PACKAGE_IMAGES.length]
    if (!filename) throw new Error('Bean package seed image is missing')

    const file = Bun.file(
      new URL(`seed-assets/bean-packaging/${filename}`, import.meta.url),
    )
    const storagePath = `beans/${bean.id}/seed-${filename}`
    const bytes = Buffer.from(await file.arrayBuffer())

    await storage.upload(file, storagePath)
    await generateAndUploadThumbnail(bytes, storagePath)
    await db.insert(schema.beanImages).values({
      beanId: bean.id,
      storagePath,
      originalFilename: filename,
      mimeType: 'image/webp',
      sizeBytes: file.size,
      isThumbnail: true,
    })
  }
  console.log(`    ✓ ${insertedBeans.length} bean package images`)

  console.log('  → Inserting gear...')
  const insertedGear = await db.insert(schema.gear).values(GEAR).returning()
  console.log(`    ✓ ${insertedGear.length} gear items`)

  const machines = insertedGear.filter(
    (g) => g.type === 'espresso_machine' && !g.isArchived,
  )
  const grinders = insertedGear.filter(
    (g) => g.type === 'grinder' && !g.isArchived,
  )
  const activeBeans = insertedBeans.filter((b) => !b.isArchived)

  console.log('  → Inserting recipes...')
  const beanMap = new Map(insertedBeans.map((bean) => [bean.name, bean.id]))
  const recipeData = RECIPES.map(({ brewingMethod, bean, ...recipe }) => {
    const brewingMethodId = brewingMethodMap.get(brewingMethod)
    if (!brewingMethodId) {
      throw new Error(`${brewingMethod} brewing method is missing`)
    }

    return {
      ...recipe,
      brewingMethodId,
      beanId: beanMap.get(bean) ?? null,
    }
  })
  const insertedRecipes = await db
    .insert(schema.recipes)
    .values(recipeData)
    .returning()
  console.log(`    ✓ ${insertedRecipes.length} recipes`)

  console.log('  → Inserting shots...')
  const shotData = []
  for (let i = 0; i < 25; i++) {
    const bean = randomElement(activeBeans)
    const machine = machines[0]
    const grinder = grinders[0]
    const brewedAt = daysAgo(randomInt(0, 30))

    shotData.push({
      beanId: bean?.id ?? null,
      grinderId: grinder?.id ?? null,
      machineId: machine?.id ?? null,
      brewingMethodId: espressoMethod.id,
      doseGrams: (17 + Math.random() * 2).toFixed(1),
      yieldGrams: (34 + Math.random() * 8).toFixed(1),
      shotTimeSeconds: String(randomInt(24, 35)),
      grindSetting: String(randomInt(10, 20)),
      brewTemperatureCelsius: (92 + Math.random() * 4).toFixed(1),
      brewPressureBar: (8 + Math.random() * 2).toFixed(1),
      rating: randomInt(3, 5),
      notes: randomElement([
        'Good balance, slight channeling at the end.',
        'Excellent extraction. Sweet and syrupy.',
        'A bit sour - try coarser next time.',
        'Perfect shot! Dialed in.',
        'Ran fast, but still tasty.',
        null,
        null,
      ]),
      brewedAt,
      createdAt: brewedAt,
    })
  }
  const insertedShots = await db
    .insert(schema.shots)
    .values(shotData)
    .returning()
  console.log(`    ✓ ${insertedShots.length} shots`)

  console.log('  → Adding taste tags to shots...')
  const shotTagData = []
  for (const shot of insertedShots) {
    for (const tag of randomSubset(allTags, 1, 4)) {
      shotTagData.push({
        shotId: shot.id,
        tasteTagId: tag.id,
      })
    }
  }
  await db.insert(schema.shotTasteTags).values(shotTagData)
  console.log(`    ✓ ${shotTagData.length} shot taste tags`)

  console.log('  → Inserting coffee shops...')
  const insertedCoffeeShops = await db
    .insert(schema.coffeeShops)
    .values(COFFEE_SHOPS)
    .returning()
  console.log(`    ✓ ${insertedCoffeeShops.length} coffee shops`)

  console.log('  → Uploading synthetic coffee shop favicons...')
  await uploadSeedFavicons(storage, 'coffee-shops', insertedCoffeeShops)
  console.log(`    ✓ ${insertedCoffeeShops.length} coffee shop favicons`)

  console.log('  → Inserting cafe visits...')
  const visitData = []
  for (let i = 0; i < 12; i++) {
    const coffeeShop = randomElement(insertedCoffeeShops)
    visitData.push({
      coffeeShopId: coffeeShop.id,
      beanId:
        Math.random() > 0.7 ? (randomElement(activeBeans)?.id ?? null) : null,
      drinkName: randomElement([
        'Flat White',
        'Cortado',
        'Espresso',
        'Filter',
        'Cappuccino',
        'V60',
      ]),
      drinkType: randomElement(['espresso', 'filter', 'milk']),
      price: (3 + Math.random() * 3).toFixed(2),
      currency: 'EUR',
      rating: randomInt(3, 5),
      notes: randomElement([
        'Great vibes, will come back.',
        'Coffee was excellent but crowded.',
        'Friendly barista, recommended a new roaster.',
        'Filter was exceptional today.',
        null,
        null,
      ]),
      visitedAt: daysAgo(randomInt(0, 60)),
    })
  }
  const insertedVisits = await db
    .insert(schema.cafeVisits)
    .values(visitData)
    .returning()
  console.log(`    ✓ ${insertedVisits.length} cafe visits`)

  console.log('  → Adding taste tags to visits...')
  const visitTagData = []
  for (const visit of insertedVisits) {
    for (const tag of randomSubset(allTags, 0, 3)) {
      visitTagData.push({
        cafeVisitId: visit.id,
        tasteTagId: tag.id,
      })
    }
  }
  if (visitTagData.length > 0) {
    await db.insert(schema.cafeVisitTasteTags).values(visitTagData)
  }
  console.log(`    ✓ ${visitTagData.length} visit taste tags`)

  console.log('\n✅ Seeding complete!')
  console.log(`
Summary:
  - ${insertedTags.length} taste tags
  - ${insertedRoasters.length} roasters
  - ${insertedBeans.length} beans (${insertedBeans.filter((b) => b.isArchived).length} archived)
  - ${insertedGear.length} gear items (${insertedGear.filter((g) => g.isArchived).length} archived)
  - ${insertedRecipes.length} recipes
  - ${insertedShots.length} shots
  - ${insertedCoffeeShops.length} coffee shops
  - ${insertedVisits.length} cafe visits
`)

  await client.end()
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
