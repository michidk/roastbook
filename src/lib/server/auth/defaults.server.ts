import '@tanstack/react-start/server-only'
import { sql } from 'drizzle-orm'
import type { getControlDb } from '@/db/connection.server'
import {
  beanTags,
  brewingMethodDrinkTypes,
  brewingMethods,
  drinkOptionGroups,
  drinkOptionValues,
  drinkTypeOptionGroups,
  drinkTypes,
  tasteTags,
} from '@/db/schema'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getControlDb>['transaction']>[0]
>[0]

export async function createJournalDefaults(tx: Transaction, userId: string) {
  await tx.execute(sql`select set_config('roastbook.user_id', ${userId}, true)`)
  await tx
    .insert(beanTags)
    .values([{ name: 'Reorder' }, { name: 'Want to try' }])
  const drinks = await tx
    .insert(drinkTypes)
    .values(
      [
        'Espresso',
        'Doppio',
        'Ristretto',
        'Lungo',
        'Americano',
        'Latte',
        'Cappuccino',
        'Flat White',
        'Cortado',
        'Macchiato',
        'Mocha',
        'Filter',
        'Iced Coffee',
        'Tea',
        'Hot Chocolate',
        'Other',
      ].map((name) => ({ name })),
    )
    .returning()
  const methods = await tx
    .insert(brewingMethods)
    .values(
      DEFAULT_BREWING_METHODS.map((m) => ({
        name: m.name,
        description: m.description,
        enabledParameters: [...m.enabledParameters],
        timerEnabled: m.timerEnabled,
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
      .values(
        [
          'Whole milk',
          'Semi-skimmed milk',
          'Skimmed milk',
          'Oat milk',
          'Soy milk',
          'Almond milk',
        ].map((name) => ({ name, groupId: milk.id })),
      )
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
    .values(
      [
        'Chocolate',
        'Caramel',
        'Nutty',
        'Fruity',
        'Floral',
        'Citrus',
        'Berry',
        'Spicy',
        'Earthy',
        'Smoky',
        'Burnt',
      ].map((name) => ({ name })),
    )
}
