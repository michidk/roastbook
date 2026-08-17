import * as schema from '../src/db/schema'
import { DEFAULT_BREWING_METHODS } from '../src/lib/brewing-methods'
import { refreshWebsiteFaviconBestEffort } from '../src/lib/server/favicon-cache.server'
import { client, db } from './database'
import { TASTE_TAGS } from './taste-tags'

const ROASTERS = [
  {
    name: 'Onyx Coffee Lab',
    location: 'Rogers, Arkansas',
    country: 'United States',
    website: 'https://onyxcoffeelab.com',
    instagramHandle: 'onyxcoffeelab',
    notes:
      'Multiple-time Roaster of the Year. Known for exceptional single origins.',
  },
  {
    name: 'George Howell',
    location: 'Boston, Massachusetts',
    country: 'United States',
    website: 'https://georgehowellcoffee.com',
    instagramHandle: 'georgehowellcoffee',
    notes: 'Pioneer of specialty coffee. Incredible sourcing and roasting.',
  },
  {
    name: 'Counter Culture',
    location: 'Durham, North Carolina',
    country: 'United States',
    website: 'https://counterculturecoffee.com',
    instagramHandle: 'counterculturecoffee',
    notes: 'Sustainable sourcing focus. Great training programs.',
  },
  {
    name: 'Square Mile',
    location: 'London',
    country: 'United Kingdom',
    website: 'https://squaremilecoffee.com',
    instagramHandle: 'squaremilecoffee',
    notes: 'Founded by World Barista Champions. Nordic-style roasting.',
  },
  {
    name: 'The Barn',
    location: 'Berlin',
    country: 'Germany',
    website: 'https://thebarn.de',
    instagramHandle: 'thebarnberlin',
    notes: "Berlin's iconic specialty roaster. Light roasts.",
  },
]

const BEANS = [
  {
    name: 'Ethiopia Yirgacheffe Kochere',
    roaster: 'Onyx Coffee Lab',
    origin: 'Ethiopia',
    region: 'Yirgacheffe',
    farm: 'Kochere Cooperative',
    variety: 'Heirloom',
    process: 'Washed',
    roastLevel: 'light' as const,
    roastDate: daysAgo(14),
    notes:
      'Bright and floral with notes of jasmine, bergamot, and lemon zest. Excellent as a pourover.',
  },
  {
    name: 'Colombia Huila Pink Bourbon',
    roaster: 'George Howell',
    origin: 'Colombia',
    region: 'Huila',
    farm: 'Finca El Paraíso',
    variety: 'Pink Bourbon',
    process: 'Natural',
    roastLevel: 'medium_light' as const,
    roastDate: daysAgo(10),
    notes:
      'Strawberry jam sweetness, wine-like acidity, and a long chocolatey finish.',
  },
  {
    name: 'Guatemala Antigua',
    roaster: 'Counter Culture',
    origin: 'Guatemala',
    region: 'Antigua',
    farm: 'Finca La Soledad',
    variety: 'Bourbon, Caturra',
    process: 'Washed',
    roastLevel: 'medium' as const,
    roastDate: daysAgo(21),
    notes:
      'Classic Central American profile - milk chocolate, orange, and brown sugar.',
  },
  {
    name: 'Kenya Nyeri AA',
    roaster: 'Square Mile',
    origin: 'Kenya',
    region: 'Nyeri',
    variety: 'SL28, SL34',
    process: 'Washed',
    roastLevel: 'light' as const,
    roastDate: daysAgo(7),
    notes:
      'Blackcurrant, tomato, and a sparkling acidity. Intense and complex.',
  },
  {
    name: 'Brazil Cerrado',
    roaster: 'Local Roaster',
    origin: 'Brazil',
    region: 'Cerrado Mineiro',
    variety: 'Yellow Bourbon',
    process: 'Pulped Natural',
    roastLevel: 'medium_dark' as const,
    roastDate: daysAgo(30),
    notes:
      'Low acidity, heavy body. Peanut butter, dark chocolate, and molasses.',
    isArchived: true,
  },
]

const GEAR = [
  {
    name: 'Decent DE1PRO',
    brand: 'Decent Espresso',
    model: 'DE1PRO',
    type: 'espresso_machine' as const,
    purchaseDate: daysAgo(365),
    purchasePrice: '3299.00',
    priceCurrency: 'EUR',
    productUrl: 'https://decentespresso.com/de1pro',
    notes: 'Pressure profiling machine. Running firmware 1.42.',
  },
  {
    name: 'Niche Zero',
    brand: 'Niche',
    model: 'Zero',
    type: 'grinder' as const,
    purchaseDate: daysAgo(400),
    purchasePrice: '629.00',
    priceCurrency: 'EUR',
    productUrl: 'https://www.nichecoffee.co.uk/products/niche-zero',
    notes: '63mm conical burrs. Great single-dosing workflow.',
  },
  {
    name: 'Acaia Lunar',
    brand: 'Acaia',
    model: 'Lunar 2021',
    type: 'scale' as const,
    purchaseDate: daysAgo(500),
    purchasePrice: '250.00',
    priceCurrency: 'EUR',
    productUrl: 'https://acaia.co/products/lunar',
    notes: '0.1g precision. Bluetooth connected.',
  },
  {
    name: 'Normcore V4',
    brand: 'Normcore',
    model: 'V4',
    type: 'tamper' as const,
    purchaseDate: daysAgo(300),
    purchasePrice: '89.00',
    priceCurrency: 'EUR',
    notes: 'Spring-loaded, 58.5mm. Very consistent.',
  },
  {
    name: 'Weiss Distribution Technique',
    brand: 'Generic',
    model: 'WDT Tool',
    type: 'wdt' as const,
    purchasePrice: '15.00',
    priceCurrency: 'EUR',
    notes: '0.4mm acupuncture needles. Essential for distribution.',
  },
  {
    name: 'Old Baratza Encore',
    brand: 'Baratza',
    model: 'Encore',
    type: 'grinder' as const,
    purchaseDate: daysAgo(1500),
    purchasePrice: '139.00',
    priceCurrency: 'EUR',
    notes: 'Retired after upgrading to Niche. Great entry-level grinder.',
    isArchived: true,
  },
]

const RECIPES = [
  {
    name: 'Daily Espresso',
    brewingMethod: 'Espresso',
    bean: 'Ethiopia Yirgacheffe Kochere',
    doseGrams: '18.0',
    yieldGrams: '40.0',
    shotTimeSeconds: '29',
    grindSetting: '15',
    brewTemperatureCelsius: '93.0',
    brewPressureBar: '9.0',
    preinfusionTimeSeconds: '6',
  },
  {
    name: 'Sweet Pink Bourbon Espresso',
    brewingMethod: 'Espresso',
    bean: 'Colombia Huila Pink Bourbon',
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
    bean: 'Kenya Nyeri AA',
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
    bean: 'Guatemala Antigua',
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
    name: 'The Barn',
    address: 'Auguststraße 58',
    city: 'Berlin',
    country: 'Germany',
    latitude: '52.5267',
    longitude: '13.3900',
    website: 'https://thebarn.de',
    instagramHandle: 'thebarnberlin',
    notes: 'Excellent specialty coffee. Try the filter flights.',
  },
  {
    name: 'Bonanza Coffee',
    address: 'Oderberger Str. 35',
    city: 'Berlin',
    country: 'Germany',
    latitude: '52.5387',
    longitude: '13.4099',
    website: 'https://bonanzacoffee.de',
    instagramHandle: 'bonanzacoffee',
    notes: "One of Berlin's OG specialty roasters.",
  },
  {
    name: 'Tim Wendelboe',
    address: 'Grünerløkka',
    city: 'Oslo',
    country: 'Norway',
    latitude: '59.9225',
    longitude: '10.7580',
    website: 'https://timwendelboe.no',
    instagramHandle: 'timaborsen',
    notes: 'Legendary Nordic roaster. Worth the trip.',
  },
  {
    name: 'Prufrock Coffee',
    address: '23-25 Leather Lane',
    city: 'London',
    country: 'United Kingdom',
    latitude: '51.5195',
    longitude: '-0.1090',
    website: 'https://prufrockcoffee.com',
    instagramHandle: 'prufrockcoffee',
    notes: 'Home of the London School of Coffee.',
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

async function seed() {
  console.log('🌱 Seeding database...')

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

  console.log('  → Fetching roaster favicons...')
  await Promise.all(
    insertedRoasters.map((roaster) =>
      refreshWebsiteFaviconBestEffort({
        entityType: 'roasters',
        entityId: roaster.id,
        website: roaster.website,
      }),
    ),
  )
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
