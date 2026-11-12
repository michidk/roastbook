import '@tanstack/react-start/server-only'
import { sql } from 'drizzle-orm'
import type { getControlDb } from '@/db/connection.server'
import {
  brewingMethodDrinkTypes,
  brewingMethods,
  drinkOptionGroups,
  drinkOptionValues,
  drinkTypeOptionGroups,
  drinkTypes,
  tasteTags,
} from '@/db/schema'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'
import {
  BUILT_IN_DRINK_TYPE_NAMES,
  BUILT_IN_MILK_NAMES,
} from '@/lib/drink-options'
import { BUILT_IN_TASTE_TAG_NAMES } from '@/lib/taste-tags'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getControlDb>['transaction']>[0]
>[0]

export async function createJournalDefaults(tx: Transaction, userId: string) {
  await tx.execute(sql`select set_config('roastbook.user_id', ${userId}, true)`)
  const drinks = await tx
    .insert(drinkTypes)
    .values(BUILT_IN_DRINK_TYPE_NAMES.map((name) => ({ name })))
    .returning()
  const methods = await tx
    .insert(brewingMethods)
    .values(
      DEFAULT_BREWING_METHODS.map((m) => ({
        name: m.name,
        description: m.description,
        enabledParameters: [...m.enabledParameters],
        timerEnabled: m.timerEnabled,
        brewMethodId: m.brewMethodId,
      })),
    )
    .returning()
  const links = DEFAULT_BREWING_METHODS.flatMap((m) =>
    m.drinkTypeNames.flatMap((name) => {
      const method = methods.find((v) => v.name === m.name),
        drink = drinks.find((v) => v.name === name)
      return method && drink
        ? [{ brewingMethodId: method.id, drinkTypeId: drink.id }]
        : []
    }),
  )
  if (links.length) await tx.insert(brewingMethodDrinkTypes).values(links)
  const [milk] = await tx
    .insert(drinkOptionGroups)
    .values({ name: 'Milk' })
    .returning()
  if (milk) {
    await tx
      .insert(drinkOptionValues)
      .values(BUILT_IN_MILK_NAMES.map((name) => ({ name, groupId: milk.id })))
    const milkDrinks = drinks.filter((d) =>
      [
        'Latte',
        'Cappuccino',
        'Flat White',
        'Cortado',
        'Macchiato',
        'Mocha',
      ].includes(d.name),
    )
    if (milkDrinks.length)
      await tx.insert(drinkTypeOptionGroups).values(
        milkDrinks.map((d) => ({
          drinkTypeId: d.id,
          optionGroupId: milk.id,
        })),
      )
  }
  await tx
    .insert(tasteTags)
    .values(BUILT_IN_TASTE_TAG_NAMES.map((name) => ({ name })))
}
