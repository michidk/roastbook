import { expect, test } from 'bun:test'
import {
  emptyJournalTables,
  type JournalState,
  JournalTransaction,
} from '@roastbook/journal-domain/state'
import { executeCommand } from './commands'
import { readJournal } from './reads'

function seed(): JournalState {
  const tx = new JournalTransaction(emptyJournalTables())
  tx.insert('settings', { id: 1 })
  tx.insert('brewingMethods', {
    name: 'Espresso',
    enabledParameters: ['doseGrams', 'yieldGrams', 'beanId'],
    timerEnabled: false,
  })
  return {
    format: 1,
    revision: 0,
    serverRevision: 0,
    tables: tx.finish(),
    mediaNamespace: 'demo',
    media: {},
    pending: [],
    account: null,
    identifiers: null,
    policy: { maxImagesPerItem: 3, limitBytes: 50 * 1024 * 1024 },
  }
}

test('unknown queries and commands fail at the shared journal boundary', () => {
  const state = seed()
  const before = structuredClone(state)
  for (const operation of [
    'toString',
    '__proto__',
    'suggestions/unknown',
    'beans/unknown',
  ]) {
    expect(() => readJournal(state, operation, undefined)).toThrow(
      'unavailable',
    )
    expect(() =>
      executeCommand(state, {
        id: crypto.randomUUID(),
        operation,
        data: null,
        allocations: {},
        createdAt: new Date().toISOString(),
      }),
    ).toThrow('unavailable')
  }
  expect(state).toEqual(before)
})
test('local CRUD updates relationships, search, counts and complete statistics', () => {
  let state = seed()
  const call = (operation: string, data: unknown) => {
    const result = executeCommand(state, {
      id: crypto.randomUUID(),
      operation,
      data: JSON.parse(JSON.stringify(data)),
      allocations: {},
      createdAt: new Date().toISOString(),
    })
    state = result.state
    return result.result
  }
  const bean = call('beans/createBean', { name: 'Test bean', weight: '250' })
  expect(bean).toHaveProperty('purchaseId')
  const id = state.tables.beans[0]?.id
  const purchaseId = state.tables.beanPurchases[0]?.id
  const brewingMethodId = state.tables.brewingMethods[0]?.id
  call('shots/createShot', {
    beanId: id,
    beanPurchaseId: purchaseId,
    brewingMethodId,
    doseGrams: '18',
    yieldGrams: '36',
    rating: 4,
  })
  expect(
    readJournal(state, 'stats/getDashboardStats', undefined),
  ).toHaveProperty('totalShots', 1)
  expect(
    readJournal(state, 'stats/getDetailedStats', { period: 'all' }),
  ).toMatchObject({
    shots: { total: 1 },
    beans: { totalGramsUsed: 18 },
    brewing: { avgRatio: 2 },
  })
  expect(
    readJournal(state, 'command-search/searchCommandEntities', {
      query: 'Test bean',
    }),
  ).toHaveProperty('beans.0.label', 'Test bean')
  call('beans/updateBean', { id, name: 'Renamed bean' })
  expect(
    readJournal(state, 'shots/getShot', state.tables.shots[0]?.id),
  ).toHaveProperty('bean.name', 'Renamed bean')
  expect(call('beans/deleteBean', id)).toEqual({ archived: true })
  const shotId = state.tables.shots[0]?.id
  call('shots/deleteShot', shotId)
  expect(call('beans/deleteBean', id)).toEqual({ archived: false })
  expect(state.tables.beanPurchases).toEqual([])
  expect(
    readJournal(state, 'stats/getDashboardStats', undefined),
  ).toHaveProperty('totalShots', 0)
})

test('invalid related writes leave all source records unchanged', () => {
  const state = seed()
  const command = {
    id: crypto.randomUUID(),
    operation: 'shots/createShot',
    data: { brewingMethodId: 1, beanPurchaseId: 999, doseGrams: '18' },
    allocations: {},
    createdAt: new Date().toISOString(),
  }
  expect(() => executeCommand(state, command)).toThrow()
  expect(state.tables.shots).toEqual([])
  expect(state.tables.shotTasteTags).toEqual([])
  expect(() =>
    executeCommand(state, { ...command, operation: 'ai/run' }),
  ).toThrow('unavailable')
})

test('image metadata, thumbnails, limits, cascades and settings commit atomically', () => {
  let state = seed()
  const call = (operation: string, data: unknown) => {
    const result = executeCommand(state, {
      id: crypto.randomUUID(),
      operation,
      data: JSON.parse(JSON.stringify(data)),
      createdAt: new Date().toISOString(),
      allocations: {},
    })
    state = result.state
    return result.result
  }
  call('beans/createBean', { name: 'Picture bag', weight: '250' })
  const entityId = state.tables.beanPurchases[0]?.id ?? 0
  const target = { entityType: 'bean-purchases', entityId }
  const upload = {
    ...target,
    filename: 'bag.webp',
    digest: '0'.repeat(64),
    files: ['Y29mZmVl', 'dGh1bWI=', 'c21hbGw='],
  }
  for (let count = 0; count < 3; count++)
    call('images/uploadEntityImage', upload)
  expect(Object.keys(state.media)).toHaveLength(9)
  expect(state.tables.beanImages).toHaveLength(3)
  const imageId = state.tables.beanImages[1]?.id ?? 0
  call('images/setImageAsThumbnail', { ...target, imageId })
  expect(
    state.tables.beanImages
      .filter((image) => image.isThumbnail)
      .map((image) => image.id),
  ).toEqual([imageId])
  const previous = structuredClone(state)
  expect(() => call('images/uploadEntityImage', upload)).toThrow('at most 3')
  expect(() =>
    call('images/deleteEntityImage', { ...target, entityId: 999, imageId }),
  ).toThrow('Picture not found')
  expect(state).toEqual(previous)
  call('images/deleteEntityImage', { ...target, imageId })
  expect(Object.keys(state.media)).toHaveLength(6)
  call('settings/updateLightTheme', 'pure-light')
  call('settings/updateBackgroundTextureEnabled', false)
  call('settings/updateBackgroundGrainEnabled', false)
  expect(state.tables.settings[0]).toMatchObject({
    lightTheme: 'pure-light',
    backgroundTextureEnabled: false,
    backgroundGrainEnabled: false,
  })
  call('beans/deleteBean', state.tables.beans[0]?.id)
  expect(state.tables.beanImages).toEqual([])
  expect(state.media).toEqual({})
})

test('product identifiers use persisted reservations and stop safely when exhausted', () => {
  const original = seed()
  const reserved = {
    ...original,
    identifiers: { beans: [231], beanPurchases: [415] },
  }
  const command = {
    id: crypto.randomUUID(),
    operation: 'beans/createBean',
    data: { name: 'Offline reserved' },
    createdAt: new Date().toISOString(),
    allocations: {},
  }
  const saved = executeCommand(reserved, command)
  expect(saved.state.tables.beans[0]?.id).toBe(231)
  expect(saved.state.tables.beanPurchases[0]?.id).toBe(415)
  expect(saved.state.identifiers).toEqual({ beans: [], beanPurchases: [] })
  expect(() =>
    executeCommand(saved.state, {
      ...command,
      id: crypto.randomUUID(),
      allocations: {},
    }),
  ).toThrow('reserve more record identifiers')
  expect(saved.state.tables.beans).toHaveLength(1)
  expect(executeCommand(original, command).state.tables.beans[0]?.id).toBe(231)
})

test('every integration and remote journal operation is absent from local commands', () => {
  const state = seed()
  for (const operation of [
    'ai/run',
    'geocoding/searchCoffeeShopCandidates',
    'remote-image/downloadRemoteImage',
    'account/createToken',
    'replication/pushRecipes',
    'shottimer/createShottimerToken',
    'auth/signOut',
    'mcp/settings',
  ]) {
    expect(() =>
      executeCommand(state, {
        id: crypto.randomUUID(),
        operation,
        data: {},
        allocations: {},
        createdAt: new Date().toISOString(),
      }),
    ).toThrow('unavailable')
  }
  expect(state.pending).toEqual([])
})

test('catalogue, drink, visit and recipe edits preserve relations and update local filters', () => {
  let state = seed()
  const initial = new JournalTransaction(state.tables)
  const group = initial.insert('drinkOptionGroups', { name: 'Milk' })
  state = { ...state, tables: initial.finish() }
  const call = (operation: string, data: unknown) => {
    const executed = executeCommand(state, {
      id: crypto.randomUUID(),
      operation,
      data: JSON.parse(JSON.stringify(data)),
      createdAt: new Date().toISOString(),
      allocations: {},
    })
    state = executed.state
    return executed.result
  }
  call('roasters/createRoaster', { name: 'Local roaster' })
  const roasterId = state.tables.roasters[0]?.id
  call('beans/createBean', { name: 'Local coffee', roasterId, weight: '500' })
  const beanId = state.tables.beans[0]?.id
  call('roasters/updateRoaster', { id: roasterId, name: 'Renamed roaster' })
  expect(
    readJournal(state, 'beans/getBeanCollection', { query: 'Renamed roaster' }),
  ).toHaveProperty('totalItems', 1)
  call('gear/createGear', { brand: 'Local', model: 'Brewer', type: 'brewer' })
  const gearId = state.tables.gear[0]?.id
  call('gear-sets/createGearSet', {
    name: 'Morning',
    description: null,
    machineId: gearId,
    grinderId: null,
    basketId: null,
    accessoryGearIds: [],
  })
  const setId = state.tables.gearSets[0]?.id
  call('gear/updateGear', { id: gearId, model: 'Updated brewer' })
  expect(readJournal(state, 'gear-sets/getGearSetById', setId)).toHaveProperty(
    'machine.name',
    'Local Updated brewer',
  )
  call('drink-options/saveDrinkType', {
    name: 'Filter',
    optionGroupIds: [group.id],
  })
  const drinkTypeId = state.tables.drinkTypes[0]?.id
  call('drink-options/createDrinkOptionValue', {
    groupId: group.id,
    name: 'Oat',
  })
  const optionId = state.tables.drinkOptionValues[0]?.id
  call('taste-tags/createTasteTag', { name: 'Peach' })
  const tagId = state.tables.tasteTags[0]?.id
  call('coffee-shops/createCoffeeShop', {
    name: 'Local café',
    city: 'Berlin',
    latitude: '52.5',
    longitude: '13.4',
  })
  const coffeeShopId = state.tables.coffeeShops[0]?.id
  call('cafe-visits/createCafeVisit', {
    coffeeShopId,
    beanId,
    drinkTypeId,
    drinkOptionValueIds: [optionId],
    tasteTagIds: [tagId],
    price: '4.50',
    currency: 'EUR',
    rating: 4,
  })
  const visitId = state.tables.cafeVisits[0]?.id
  call('coffee-shops/updateCoffeeShop', {
    id: coffeeShopId,
    name: 'Renamed café',
    isFavorite: true,
  })
  call('cafe-visits/updateCafeVisit', {
    id: visitId,
    rating: 5,
    notes: 'Updated visit',
  })
  expect(readJournal(state, 'cafe-visits/getCafeVisit', visitId)).toMatchObject(
    {
      rating: 5,
      coffeeShop: { name: 'Renamed café' },
      drinkOptions: [{ optionValue: { name: 'Oat' } }],
    },
  )
  expect(
    readJournal(state, 'coffee-shops/getCoffeeShopPage', { list: 'favorites' }),
  ).toHaveProperty('totalItems', 1)
  expect(
    readJournal(state, 'stats/getDashboardStats', undefined),
  ).toMatchObject({ cafeVisits: 1, coffeeShops: 1 })
  call('recipes/createRecipe', {
    name: 'Morning recipe',
    brewingMethodId: state.tables.brewingMethods[0]?.id,
    beanId,
    doseGrams: '18',
    yieldGrams: '36',
  })
  const recipeId = state.tables.recipes[0]?.id
  call('recipes/updateRecipe', {
    id: recipeId,
    name: 'Updated recipe',
    brewingMethodId: state.tables.brewingMethods[0]?.id,
    beanId,
    doseGrams: '19',
    yieldGrams: '38',
  })
  expect(readJournal(state, 'recipes/getRecipe', recipeId)).toHaveProperty(
    'doseGrams',
    '19.00',
  )
  call('recipes/deleteRecipe', recipeId)
  call('taste-tags/deleteTasteTag', tagId)
  expect(state.tables.cafeVisitTasteTags).toEqual([])
  call('gear/deleteGear', gearId)
  expect(state.tables.gearSets[0]?.machineId).toBeNull()
  call('gear-sets/deleteGearSet', setId)
  call('roasters/deleteRoaster', roasterId)
  expect(state.tables.beans[0]?.roasterId).toBeNull()
  call('cafe-visits/deleteCafeVisit', visitId)
  call('coffee-shops/deleteCoffeeShop', coffeeShopId)
  expect(state.tables.cafeVisitDrinkOptions).toEqual([])
  expect(state.tables.coffeeShops).toEqual([])
})
