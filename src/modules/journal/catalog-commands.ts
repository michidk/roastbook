import { z } from 'zod'
import { beanPurchaseValuesSchema } from '@/lib/bean-purchase-input'
import { gearName } from '@/lib/gear-name'
import { positiveIdSchema, tasteTagCreateSchema } from '@/lib/server-validation'
import {
  assertValidUpdate,
  getCafeVisitUpdateErrors,
} from '@/lib/update-validation'
import {
  beanCreateSchema,
  beanUpdateSchema,
  checkAltitudeRange,
} from './beans-input'
import {
  brewingMethodUpdateSchema,
  brewingMethodWriteSchema,
  normalizeBrewingMethodWrite,
} from './brewing-methods-input'
import { cafeVisitSchema, cafeVisitUpdateSchema } from './cafe-visits-input'
import {
  coffeeShopCreateSchema,
  coffeeShopUpdateSchema,
  normalizeCoffeeShopInput,
} from './coffee-shops-input'
import {
  type CommandContext,
  defineCommand,
  replaceLinks,
  storedValues,
} from './command-context'
import {
  drinkTypeWriteSchema,
  optionValueWriteSchema,
} from './drink-options-input'
import { assertLocalDrinkSelection } from './drink-selection'
import { gearCreateSchema, gearUpdateSchema } from './gear-input'
import { syncLocalGearProperties } from './gear-properties'
import { gearSetUpdateSchema, gearSetWriteSchema } from './gear-sets-input'
import { roasterCreateSchema, roasterUpdateSchema } from './roasters-input'

function saveMethod(
  { tx }: CommandContext,
  input: z.infer<typeof brewingMethodWriteSchema> & { id?: number },
) {
  const { drinkTypeIds, ...values } = normalizeBrewingMethodWrite(input)
  if (
    tx
      .rows('brewingMethods')
      .some(
        (row) =>
          row.id !== input.id &&
          row.name.toLowerCase() === values.name.toLowerCase(),
      )
  )
    throw new Error('A brewing method with this name already exists')
  for (const id of drinkTypeIds)
    if (tx.get('drinkTypes', id).isArchived)
      throw new Error('Choose only active drink types')
  const saved = input.id
    ? tx.update('brewingMethods', input.id, values)
    : tx.insert('brewingMethods', values)
  replaceLinks(
    tx,
    'brewingMethodDrinkTypes',
    'brewingMethodId',
    saved.id,
    drinkTypeIds.map((drinkTypeId) => ({
      brewingMethodId: saved.id,
      drinkTypeId,
    })),
  )
  return { ...saved, drinkTypeIds }
}
function saveGearSet(
  { tx }: CommandContext,
  data: z.infer<typeof gearSetWriteSchema> & { id?: number },
) {
  const { accessoryGearIds, id, ...values } = data
  if (
    tx
      .rows('gearSets')
      .some(
        (row) =>
          row.id !== id && row.name.toLowerCase() === values.name.toLowerCase(),
      )
  )
    throw new Error('A gear set with this name already exists')
  for (const gearId of accessoryGearIds)
    if (tx.get('gear', gearId).isArchived)
      throw new Error('Choose active accessory gear')
  const saved = id
    ? tx.update('gearSets', id, values)
    : tx.insert('gearSets', values)
  replaceLinks(
    tx,
    'gearSetAccessoryGear',
    'gearSetId',
    saved.id,
    [...new Set(accessoryGearIds)].map((gearId) => ({
      gearSetId: saved.id,
      gearId,
    })),
  )
  return saved
}
function saveVisit(
  { tx }: CommandContext,
  data: z.infer<typeof cafeVisitUpdateSchema> | z.infer<typeof cafeVisitSchema>,
) {
  const { tasteTagIds, drinkOptionValueIds, ...values } = data
  const current = 'id' in values ? tx.get('cafeVisits', values.id) : undefined
  assertLocalDrinkSelection(
    tx,
    values.drinkTypeId === undefined
      ? current?.drinkTypeId
      : values.drinkTypeId,
    drinkOptionValueIds ??
      (current
        ? tx
            .rows('cafeVisitDrinkOptions')
            .filter((row) => row.cafeVisitId === current.id)
            .map((row) => row.optionValueId)
        : []),
  )
  const stored = z
    .object({ visitedAt: z.string().optional() })
    .passthrough()
    .parse(storedValues(values))
  const saved = current
    ? tx.update('cafeVisits', current.id, stored)
    : tx.insert('cafeVisits', stored)
  if (tasteTagIds)
    replaceLinks(
      tx,
      'cafeVisitTasteTags',
      'cafeVisitId',
      saved.id,
      [...new Set(tasteTagIds)].map((tasteTagId) => ({
        cafeVisitId: saved.id,
        tasteTagId,
      })),
    )
  if (drinkOptionValueIds)
    replaceLinks(
      tx,
      'cafeVisitDrinkOptions',
      'cafeVisitId',
      saved.id,
      [...new Set(drinkOptionValueIds)].map((optionValueId) => ({
        cafeVisitId: saved.id,
        optionValueId,
      })),
    )
  return saved
}

export const catalogCommands = {
  'beans/createBean': defineCommand(
    beanCreateSchema.superRefine(checkAltitudeRange),
    ({ tx }, data) => {
      const {
        roastDate,
        weight,
        price,
        priceCurrency,
        shopName,
        shopUrl,
        isArchived,
        ...profile
      } = data
      const bean = tx.insert('beans', profile)
      const purchase = tx.insert('beanPurchases', {
        beanId: bean.id,
        roastDate: roastDate?.toISOString(),
        initialWeightGrams: weight,
        price,
        priceCurrency,
        shopName,
        shopUrl,
        isArchived,
      })
      return { ...bean, purchaseId: purchase.id }
    },
  ),
  'beans/updateBean': defineCommand(
    beanUpdateSchema.superRefine(checkAltitudeRange),
    ({ tx }, data) => {
      const {
        id,
        roastDate: _date,
        weight: _weight,
        price: _price,
        priceCurrency: _currency,
        shopName: _shop,
        shopUrl: _url,
        isArchived,
        ...values
      } = data
      const saved = tx.update('beans', id, values)
      if (isArchived !== undefined)
        for (const purchase of tx
          .rows('beanPurchases')
          .filter((row) => row.beanId === id))
          tx.update('beanPurchases', purchase.id, { isArchived })
      return saved
    },
  ),
  'beans/deleteBean': defineCommand(positiveIdSchema, ({ tx }, id) => {
    const used =
      tx.rows('shots').some((row) => row.beanId === id) ||
      tx.rows('recipes').some((row) => row.beanId === id) ||
      tx.rows('cafeVisits').some((row) => row.beanId === id)
    if (used)
      for (const purchase of tx
        .rows('beanPurchases')
        .filter((row) => row.beanId === id))
        tx.update('beanPurchases', purchase.id, { isArchived: true })
    else {
      tx.deleteWhere('beanPurchases', (row) => row.beanId === id)
      tx.delete('beans', id)
    }
    return { archived: used }
  }),
  'bean-purchases/createBeanPurchase': defineCommand(
    beanPurchaseValuesSchema.extend({ beanId: positiveIdSchema }),
    ({ tx }, data) =>
      tx.insert(
        'beanPurchases',
        z
          .object({
            beanId: positiveIdSchema,
            purchasedAt: z.string().nullable().optional(),
            roastDate: z.string().nullable().optional(),
          })
          .passthrough()
          .parse(storedValues(data)),
      ),
  ),
  'bean-purchases/updateBeanPurchase': defineCommand(
    beanPurchaseValuesSchema
      .omit({ isArchived: true })
      .extend({ id: positiveIdSchema, beanId: positiveIdSchema }),
    ({ tx }, data) => {
      if (tx.get('beanPurchases', data.id).beanId !== data.beanId)
        throw new Error('Bag not found')
      return tx.update(
        'beanPurchases',
        data.id,
        z
          .object({
            purchasedAt: z.string().nullable().optional(),
            roastDate: z.string().nullable().optional(),
          })
          .passthrough()
          .parse(storedValues(data)),
      )
    },
  ),
  'bean-purchases/setBeanPurchaseArchived': defineCommand(
    z.object({
      id: positiveIdSchema,
      beanId: positiveIdSchema,
      isArchived: z.boolean(),
    }),
    ({ tx }, data) => {
      if (tx.get('beanPurchases', data.id).beanId !== data.beanId)
        throw new Error('Bag not found')
      return tx.update('beanPurchases', data.id, {
        isArchived: data.isArchived,
      })
    },
  ),
  'roasters/createRoaster': defineCommand(roasterCreateSchema, ({ tx }, data) =>
    tx.insert('roasters', data),
  ),
  'roasters/updateRoaster': defineCommand(
    roasterUpdateSchema,
    ({ tx }, { id, ...values }) => tx.update('roasters', id, values),
  ),
  'roasters/deleteRoaster': defineCommand(positiveIdSchema, ({ tx }, id) =>
    tx.delete('roasters', id),
  ),
  'coffee-shops/createCoffeeShop': defineCommand(
    coffeeShopCreateSchema,
    ({ tx }, data) => tx.insert('coffeeShops', normalizeCoffeeShopInput(data)),
  ),
  'coffee-shops/updateCoffeeShop': defineCommand(
    coffeeShopUpdateSchema,
    ({ tx }, { id, ...values }) =>
      tx.update('coffeeShops', id, normalizeCoffeeShopInput(values)),
  ),
  'coffee-shops/deleteCoffeeShop': defineCommand(
    positiveIdSchema,
    ({ tx }, id) => tx.delete('coffeeShops', id),
  ),
  'cafe-visits/createCafeVisit': defineCommand(cafeVisitSchema, saveVisit),
  'cafe-visits/updateCafeVisit': defineCommand(
    cafeVisitUpdateSchema,
    (context, data) => {
      assertValidUpdate(getCafeVisitUpdateErrors(data))
      return saveVisit(context, data)
    },
  ),
  'cafe-visits/deleteCafeVisit': defineCommand(positiveIdSchema, ({ tx }, id) =>
    tx.delete('cafeVisits', id),
  ),
  'brewing-methods/createBrewingMethod': defineCommand(
    brewingMethodWriteSchema,
    saveMethod,
  ),
  'brewing-methods/updateBrewingMethod': defineCommand(
    brewingMethodUpdateSchema,
    saveMethod,
  ),
  'brewing-methods/deleteBrewingMethod': defineCommand(
    positiveIdSchema,
    ({ tx }, id) => {
      if (tx.rows('brewingMethods').length <= 1)
        throw new Error('Keep at least one brewing method')
      tx.delete('brewingMethods', id)
    },
  ),
  'gear-sets/createGearSet': defineCommand(gearSetWriteSchema, saveGearSet),
  'gear-sets/updateGearSet': defineCommand(gearSetUpdateSchema, saveGearSet),
  'gear-sets/deleteGearSet': defineCommand(positiveIdSchema, ({ tx }, id) =>
    tx.delete('gearSets', id),
  ),
  'gear/createGear': defineCommand(gearCreateSchema, (context, data) => {
    const { tx } = context
    const row = tx.insert('gear', gearValues(data))
    syncLocalGearProperties(context, row.id, row.type, data, false)
    return row
  }),
  'gear/updateGear': defineCommand(gearUpdateSchema, (context, data) => {
    const { tx } = context
    const current = tx.get('gear', data.id)
    const changed = data.type !== undefined && data.type !== current.type
    if (changed && !data.confirmTypeChange)
      throw new Error(
        'Confirm the gear type change before removing incompatible details',
      )
    const values = gearValues(
      gearCreateSchema.parse({
        ...current,
        purchaseDate: current.purchaseDate
          ? new Date(current.purchaseDate)
          : null,
        brand: current.brand ?? '',
        model: current.model ?? '',
        ...data,
      }),
    )
    const saved = tx.update('gear', data.id, values)
    syncLocalGearProperties(context, saved.id, saved.type, data, changed)
    return saved
  }),
  'gear/deleteGear': defineCommand(positiveIdSchema, ({ tx }, id) =>
    tx.delete('gear', id),
  ),
  'taste-tags/createTasteTag': defineCommand(
    tasteTagCreateSchema,
    ({ tx }, data) =>
      tx.insert('tasteTags', { name: data.name, category: 'flavor' }),
  ),
  'taste-tags/deleteTasteTag': defineCommand(positiveIdSchema, ({ tx }, id) =>
    tx.delete('tasteTags', id),
  ),
  'drink-options/saveDrinkType': defineCommand(
    drinkTypeWriteSchema,
    ({ tx }, data) => {
      const duplicate = tx
        .rows('drinkTypes')
        .find((row) => row.name === data.name && row.id !== data.id)
      if (duplicate && !duplicate.isArchived)
        throw new Error('A drink type with this name already exists')
      const id = data.id ?? duplicate?.id
      const saved = id
        ? tx.update('drinkTypes', id, { name: data.name, isArchived: false })
        : tx.insert('drinkTypes', { name: data.name })
      replaceLinks(
        tx,
        'drinkTypeOptionGroups',
        'drinkTypeId',
        saved.id,
        [...new Set(data.optionGroupIds)].map((optionGroupId) => ({
          drinkTypeId: saved.id,
          optionGroupId,
        })),
      )
      return saved
    },
  ),
  'drink-options/archiveDrinkType': defineCommand(
    positiveIdSchema,
    ({ tx }, id) => tx.update('drinkTypes', id, { isArchived: true }),
  ),
  'drink-options/createDrinkOptionValue': defineCommand(
    optionValueWriteSchema,
    ({ tx }, data) => {
      const duplicate = tx
        .rows('drinkOptionValues')
        .find((row) => row.groupId === data.groupId && row.name === data.name)
      if (duplicate && !duplicate.isArchived)
        throw new Error('This option already exists')
      return duplicate
        ? tx.update('drinkOptionValues', duplicate.id, { isArchived: false })
        : tx.insert('drinkOptionValues', data)
    },
  ),
  'drink-options/archiveDrinkOptionValue': defineCommand(
    positiveIdSchema,
    ({ tx }, id) => tx.update('drinkOptionValues', id, { isArchived: true }),
  ),
}

function gearValues(data: z.infer<typeof gearCreateSchema>) {
  const {
    brand,
    model,
    type,
    purchaseDate,
    purchasePrice,
    priceCurrency,
    manualUrl,
    productUrl,
    notes,
    isArchived,
  } = data
  return {
    brand,
    model,
    type,
    purchaseDate: purchaseDate?.toISOString() ?? null,
    purchasePrice,
    priceCurrency,
    manualUrl,
    productUrl,
    notes,
    isArchived,
    name: gearName(brand, model),
  }
}
