import { expect, spyOn } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { z } from 'zod'
import { beanImages } from '@/db/schema'
import { db } from '@/lib/demo/local/database'
import { demoMedia } from '@/lib/demo/local/media'
import { allocateJournalIds } from '@/lib/demo/local/mutations'
import {
  DEMO_DATABASE_NAME,
  openDemoStorage,
  readDemoSnapshot,
  saveDemoSnapshot,
} from '@/lib/demo/local/persistence'
import { executeDemoOperation } from '@/lib/demo/local/worker'
import { getStoredImagePaths } from '@/lib/image-path'
import { requireEntityImageCapacity } from '@/lib/server/entity-image-records.server'

const originalFetch = globalThis.fetch
const assetsDirectory = process.argv[2] ?? '.demo-build/client'
const requests: string[] = []
globalThis.fetch = Object.assign(
  async (input: RequestInfo | URL) => {
    const path = String(input)
    requests.push(path)
    if (!path.startsWith('/demo-local/'))
      throw new Error(`Unexpected network request: ${path}`)
    return new Response(
      Bun.file(`${assetsDirectory}/${path.slice('/demo-local/'.length)}`),
    )
  },
  { preconnect: originalFetch.preconnect },
)
let queue = Promise.resolve()
Object.defineProperty(navigator, 'locks', {
  value: {
    request: (_name: string, work: () => Promise<unknown>) => {
      const result = queue.then(work)
      queue = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
  },
})
const visitorA = new IDBFactory()
Object.defineProperty(globalThis, 'indexedDB', {
  configurable: true,
  writable: true,
  value: visitorA,
})
async function call(operation: string, data?: unknown) {
  return (await executeDemoOperation(operation, data)).value
}
const beansSchema = z.array(z.object({ id: z.number(), name: z.string() }))
const initial = beansSchema.parse(await call('beans/getBeans'))
expect(initial.length).toBeGreaterThan(2)
const storage = await openDemoStorage()
const first = await readDemoSnapshot(storage)
expect(first?.version).toBe(1)
expect(first?.schemaVersion).toEndWith('.sql')
const overview = await call('stats/getDashboardStats')
expect(overview).toHaveProperty('totalShots')

const bean = await call('beans/createBean', {
  name: 'Browser test bean',
  origin: 'Local origin',
  weight: '250',
})
expect(bean).toHaveProperty('purchaseId')
const beanId = z.object({ id: z.number() }).parse(bean).id
await call('beans/updateBean', { id: beanId, notes: 'Persistent local note' })
expect(await call('beans/getBean', beanId)).toHaveProperty(
  'notes',
  'Persistent local note',
)
const namedId = z.object({ id: z.number() })
const purchaseId = namedId.parse(
  await call('bean-purchases/createBeanPurchase', {
    beanId,
    initialWeightGrams: '500',
  }),
).id
await call('bean-purchases/updateBeanPurchase', {
  id: purchaseId,
  beanId,
  initialWeightGrams: '400',
})
await call('bean-purchases/setBeanPurchaseArchived', {
  id: purchaseId,
  beanId,
  isArchived: true,
})
const drinkId = namedId.parse(
  await call('drink-options/saveDrinkType', {
    name: 'Local drink',
    optionGroupIds: [],
  }),
).id
await call('drink-options/saveDrinkType', {
  id: drinkId,
  name: 'Edited drink',
  optionGroupIds: [],
})
await call('drink-options/archiveDrinkType', drinkId)
const methodValues = {
  name: 'Local method',
  description: null,
  timerEnabled: false,
  enabledParameters: [],
  drinkTypeIds: [],
}
const customMethod = namedId.parse(
  await call('brewing-methods/createBrewingMethod', methodValues),
).id
await call('brewing-methods/updateBrewingMethod', {
  ...methodValues,
  id: customMethod,
  name: 'Edited method',
})
expect(
  await call('brewing-methods/getBrewingMethod', customMethod),
).toHaveProperty('name', 'Edited method')
await call('brewing-methods/deleteBrewingMethod', customMethod)
const roasterId = namedId.parse(
  await call('roasters/createRoaster', { name: 'Local roaster' }),
).id
await call('roasters/updateRoaster', { id: roasterId, notes: 'Edited roaster' })
expect(await call('roasters/getRoaster', roasterId)).toHaveProperty(
  'notes',
  'Edited roaster',
)
const gearId = namedId.parse(
  await call('gear/createGear', {
    brand: 'Local',
    model: 'Grinder',
    type: 'grinder',
  }),
).id
await call('gear/updateGear', { id: gearId, notes: 'Edited grinder' })
expect(await call('gear/getGearById', gearId)).toHaveProperty(
  'notes',
  'Edited grinder',
)
const setValues = {
  name: 'Local setup',
  description: null,
  machineId: null,
  grinderId: gearId,
  basketId: null,
  accessoryGearIds: [],
}
const setId = namedId.parse(await call('gear-sets/createGearSet', setValues)).id
await call('gear-sets/updateGearSet', {
  ...setValues,
  id: setId,
  name: 'Edited setup',
})
expect(await call('gear-sets/getGearSetById', setId)).toHaveProperty(
  'grinderId',
  gearId,
)
await call('gear-sets/deleteGearSet', setId)
await call('gear/deleteGear', gearId)
await call('roasters/deleteRoaster', roasterId)
const shopId = namedId.parse(
  await call('coffee-shops/createCoffeeShop', {
    name: 'Local café',
    website: 'https://example.invalid',
  }),
).id
await call('coffee-shops/updateCoffeeShop', {
  id: shopId,
  notes: 'Edited café',
  latitude: null,
  longitude: null,
})
expect(await call('coffee-shops/getCoffeeShop', shopId)).toHaveProperty(
  'notes',
  'Edited café',
)
const visitId = namedId.parse(
  await call('cafe-visits/createCafeVisit', {
    coffeeShopId: shopId,
    beanId,
    notes: 'Local visit',
  }),
).id
await call('cafe-visits/updateCafeVisit', {
  id: visitId,
  notes: 'Edited visit',
})
expect(await call('cafe-visits/getCafeVisit', visitId)).toHaveProperty(
  'notes',
  'Edited visit',
)
expect(
  await call('cafe-visits/getCafeVisitPage', { query: 'Local café' }),
).toHaveProperty('totalItems', 1)
await call('cafe-visits/deleteCafeVisit', visitId)
await call('coffee-shops/deleteCoffeeShop', shopId)
const tagId = namedId.parse(
  await call('taste-tags/createTasteTag', { name: 'Local flavor' }),
).id
expect(await call('taste-tags/getTasteTags')).toContainEqual(
  expect.objectContaining({ id: tagId }),
)
await call('taste-tags/deleteTasteTag', tagId)
const collection = await call('beans/getBeanCollection', {
  query: 'Browser test bean',
})
expect(collection).toHaveProperty('totalItems', 1)
expect(
  await call('command-search/searchCommandEntities', {
    query: 'Browser test bean',
  }),
).toHaveProperty('beans')
const methods = z
  .array(z.object({ id: z.number(), name: z.string() }))
  .parse(await call('brewing-methods/getBrewingMethods'))
const method = methods.find((item) => item.name === 'Espresso')
if (!method) throw new Error('Missing sample brewing method')
const recipeId = namedId.parse(
  await call('recipes/createRecipe', {
    name: 'Local recipe',
    brewingMethodId: method.id,
    beanId,
    doseGrams: '18',
  }),
).id
await call('recipes/updateRecipe', {
  id: recipeId,
  name: 'Edited recipe',
  brewingMethodId: method.id,
  beanId,
})
expect(await call('recipes/getRecipe', recipeId)).toHaveProperty(
  'name',
  'Edited recipe',
)
await call('recipes/deleteRecipe', { id: recipeId })
const brew = await call('shots/createShot', {
  brewingMethodId: method.id,
  beanId,
  doseGrams: '18',
  yieldGrams: '36',
  shotTimeSeconds: '28',
  notes: 'Browser brew',
})
const brewId = z.object({ id: z.number() }).parse(brew).id
expect(await call('shots/getShot', brewId)).toHaveProperty('beanId', beanId)
expect(await call('stats/getDashboardStats')).toHaveProperty(
  'totalShots',
  Number(Reflect.get(Object(overview), 'totalShots')) + 1,
)
await call('shots/updateShot', {
  id: brewId,
  brewingMethodId: method.id,
  beanId,
  notes: 'Edited brew',
})
expect(await call('shots/getShot', brewId)).toHaveProperty(
  'notes',
  'Edited brew',
)
expect(await call('beans/deleteBean', beanId)).toEqual({ archived: true })
expect(await call('shots/getShot', brewId)).toHaveProperty('beanId', beanId)
await call('shots/deleteShot', brewId)
// Reproduce purchase-cascade deletion with real image metadata and persisted blobs.
const [imageId] = await allocateJournalIds(beanImages)
const picturePath = 'demo-local/cascade-test.webp'
await db.insert(beanImages).values({
  id: imageId,
  ownerId: 'local',
  beanId,
  beanPurchaseId: purchaseId,
  storagePath: picturePath,
  originalFilename: 'cascade-test.webp',
  mimeType: 'image/webp',
  sizeBytes: 7,
  storageBytes: 21,
})
for (const path of getStoredImagePaths([picturePath]))
  demoMedia.set(path, new Blob(['picture']))
await call('beans/updateBean', {
  id: beanId,
  notes: 'Persist the picture with its parent',
})
expect((await readDemoSnapshot(storage))?.media).toHaveLength(3)
if (!imageId) throw new Error('Missing test image identifier')
await requireEntityImageCapacity('bean-purchases', purchaseId, 3)
await expect(
  requireEntityImageCapacity('bean-purchases', purchaseId, 1),
).rejects.toThrow('at most 1')
await expect(
  requireEntityImageCapacity('bean-purchases', 999999, 3),
).rejects.toThrow('Record not found')
await call('images/setImageAsThumbnail', {
  entityType: 'bean-purchases',
  entityId: purchaseId,
  imageId,
})
await expect(
  call('images/setImageAsThumbnail', {
    entityType: 'bean-purchases',
    entityId: purchaseId,
    imageId: 999999,
  }),
).rejects.toThrow('Image not found')
await call('beans/getBean', beanId)
const [thumbnail] = await db
  .select({ isThumbnail: beanImages.isThumbnail })
  .from(beanImages)
  .where(eq(beanImages.id, imageId))
expect(thumbnail?.isThumbnail).toBe(true)
await expect(
  call('images/deleteEntityImage', {
    entityType: 'bean-purchases',
    entityId: 999999,
    imageId,
  }),
).rejects.toThrow('Picture not found')
await call('beans/getBean', beanId)
await call('beans/deleteBean', beanId)
expect((await readDemoSnapshot(storage))?.media).toHaveLength(0)
expect(demoMedia.size).toBe(0)
expect(await call('beans/getBean', beanId)).toBeUndefined()
expect(await call('stats/getDashboardStats')).toHaveProperty(
  'totalShots',
  Reflect.get(Object(overview), 'totalShots'),
)

await call('settings/updateLightTheme', 'pure-light')
await call('settings/updateBackgroundTextureEnabled', false)
expect(await call('app-settings/getAppSettings')).toHaveProperty(
  'lightTheme',
  'pure-light',
)
await expect(call('beans/createBean', { name: '' })).rejects.toThrow()
await expect(
  call('shots/createShot', { brewingMethodId: 999999, beanId: 999999 }),
).rejects.toThrow()
expect(
  await call('settings/updateBackgroundGrainEnabled', false),
).toHaveProperty('lightTheme', 'pure-light')
expect(beansSchema.parse(await call('beans/getBeans'))).toHaveLength(
  initial.length,
)
expect(await call('beans/checkVisionEnabled')).toEqual({ enabled: false })
for (const operation of [
  'geocoding/searchCoffeeShopCandidates',
  'remote-image/downloadRemoteImage',
  'account/createToken',
  'replication/pushRecipes',
  'ai-provider-settings/updateAiProviderSettings',
  'shottimer/createShottimerToken',
])
  await expect(call(operation, {})).rejects.toThrow('unavailable')

// A fresh visitor has a separate IDB origin and receives the original fixtures.
Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory() })
expect(await call('app-settings/getAppSettings')).toHaveProperty(
  'lightTheme',
  'light-roast',
)
expect(beansSchema.parse(await call('beans/getBeans'))).toEqual(initial)
Object.defineProperty(globalThis, 'indexedDB', { value: visitorA })
expect(await call('app-settings/getAppSettings')).toHaveProperty(
  'lightTheme',
  'pure-light',
)
const preserved = await readDemoSnapshot(storage)
expect(preserved?.revision).not.toBe(first?.revision)
expect(preserved?.media).toEqual([])
if (!preserved) throw new Error('Missing persisted journal')
const quota = spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
  throw new DOMException('Quota exceeded', 'QuotaExceededError')
})
await expect(
  call('beans/createBean', { name: 'Must not be saved' }),
).rejects.toThrow('previous saved journal is preserved')
quota.mockRestore()
expect(await readDemoSnapshot(storage)).toHaveProperty(
  'revision',
  preserved.revision,
)
expect(beansSchema.parse(await call('beans/getBeans'))).toEqual(initial)
await saveDemoSnapshot(storage, {
  ...preserved,
  schemaVersion: '9999-future.sql',
  revision: crypto.randomUUID(),
})
await expect(call('beans/getBeans')).rejects.toThrow('newer version')
expect(await readDemoSnapshot(storage)).toHaveProperty(
  'schemaVersion',
  '9999-future.sql',
)
await saveDemoSnapshot(storage, preserved)
// Restore a real pre-0075 schema, then exercise the committed migration on reopen.
const oldClient = await PGlite.create({
  dataDir: 'memory://',
  loadDataDir: preserved.snapshot,
  fsBundle: Bun.file(`${assetsDirectory}/pglite.data`),
  pgliteWasmModule: await WebAssembly.compile(
    await Bun.file(`${assetsDirectory}/pglite.wasm`).arrayBuffer(),
  ),
})
for (const table of [
  'bean_images',
  'cafe_visit_images',
  'coffee_shop_images',
  'gear_images',
  'brew_images',
])
  await oldClient.exec(`alter table ${table} drop column storage_bytes`)
await saveDemoSnapshot(storage, {
  ...preserved,
  snapshot: await oldClient.dumpDataDir('gzip'),
  schemaVersion: '0074_fair_diamondback.sql',
  revision: crypto.randomUUID(),
})
await oldClient.close()
expect(await call('app-settings/getAppSettings')).toHaveProperty(
  'lightTheme',
  'pure-light',
)
expect(await readDemoSnapshot(storage)).toHaveProperty(
  'schemaVersion',
  preserved.schemaVersion,
)
// An inconsistent migration record must fail without reseeding or changing bytes.
const migrated = await readDemoSnapshot(storage)
if (!migrated) throw new Error('Migration did not persist')
const broken = {
  ...migrated,
  schemaVersion: '0074_fair_diamondback.sql',
  revision: crypto.randomUUID(),
}
await saveDemoSnapshot(storage, broken)
await expect(call('beans/getBeans')).rejects.toThrow()
expect(await readDemoSnapshot(storage)).toHaveProperty(
  'revision',
  broken.revision,
)
await saveDemoSnapshot(storage, migrated)
await call('demo/reset')
expect(beansSchema.parse(await call('beans/getBeans'))).toEqual(initial)
expect(await call('app-settings/getAppSettings')).toHaveProperty(
  'lightTheme',
  'light-roast',
)
expect(await call('internal-stats/getInternalStats')).toHaveProperty(
  'storage.imageCount',
)
expect(requests.every((url) => url.startsWith('/demo-local/'))).toBe(true)
expect(DEMO_DATABASE_NAME).not.toContain('owner')
storage.close()
console.log(
  'Browser journal domain, persistence, isolation, relations, derived reads, reset, and integration restrictions passed',
)
// PGlite's in-memory runtime keeps background handles until process exit.
process.exit(0)
