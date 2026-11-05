import '@tanstack/react-start/server-only'
import { type SQL, sql } from 'drizzle-orm'
import { allocateControlJournalIds } from '@/db/d1/journal-mutations.server'
import {
  brewingMethodDrinkTypes,
  brewingMethods,
  drinkTypeOptionGroups,
  drinkTypes,
} from '@/db/d1/schema'
import { DEFAULT_BREWING_METHODS } from '@/lib/brewing-methods'

/** Every insert shares the initialization guard until its final atomic update. */
export async function journalDefaultStatements(userId: string): Promise<SQL[]> {
  const reserved = await Promise.all([
    allocateControlJournalIds(drinkTypes, 16),
    allocateControlJournalIds(brewingMethods, DEFAULT_BREWING_METHODS.length),
    allocateControlJournalIds(
      brewingMethodDrinkTypes,
      DEFAULT_BREWING_METHODS.reduce(
        (count, method) => count + method.drinkTypeNames.length,
        0,
      ),
    ),
    allocateControlJournalIds(drinkTypeOptionGroups, 6),
  ])
  const take = (index: number) => {
    const id = reserved[index]?.shift()
    if (id === undefined)
      throw new Error('Invalid default journal identifier allocation')
    return id
  }

  const uninitialized = sql`exists(select 1 from auth_users where id = ${userId} and journal_initialized_at is null and deleting_at is null and email_verified = 1)`
  const statements: SQL[] = [
    sql`insert into settings(id,owner_id) select 1,${userId} where ${uninitialized}`,
  ]
  for (const name of [
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
  ])
    statements.push(
      sql`insert into drink_types(id,owner_id,name) select ${take(0)},${userId},${name} where ${uninitialized}`,
    )
  for (const method of DEFAULT_BREWING_METHODS) {
    statements.push(
      sql`insert into brewing_methods(id,owner_id,name,description,enabled_parameters,timer_enabled) select ${take(1)},${userId},${method.name},${method.description},${JSON.stringify(method.enabledParameters)},${method.timerEnabled ? 1 : 0} where ${uninitialized}`,
    )
    for (const drink of method.drinkTypeNames)
      statements.push(
        sql`insert into brewing_method_drink_types(id,owner_id,brewing_method_id,drink_type_id) select ${take(2)},${userId},m.id,d.id from brewing_methods m join drink_types d on d.owner_id=m.owner_id where m.owner_id=${userId} and m.name=${method.name} and d.name=${drink} and ${uninitialized}`,
      )
  }
  statements.push(
    sql`insert into drink_option_groups(owner_id,name) select ${userId},'Milk' where ${uninitialized}`,
  )
  for (const name of [
    'Whole milk',
    'Semi-skimmed milk',
    'Skimmed milk',
    'Oat milk',
    'Soy milk',
    'Almond milk',
  ])
    statements.push(
      sql`insert into drink_option_values(owner_id,name,group_id) select ${userId},${name},id from drink_option_groups where owner_id=${userId} and name='Milk' and ${uninitialized}`,
    )
  for (const name of [
    'Latte',
    'Cappuccino',
    'Flat White',
    'Cortado',
    'Macchiato',
    'Mocha',
  ])
    statements.push(
      sql`insert into drink_type_option_groups(id,owner_id,drink_type_id,option_group_id) select ${take(3)},${userId},d.id,g.id from drink_types d join drink_option_groups g on g.owner_id=d.owner_id where d.owner_id=${userId} and d.name=${name} and g.name='Milk' and ${uninitialized}`,
    )
  for (const name of [
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
  ])
    statements.push(
      sql`insert into taste_tags(owner_id,name) select ${userId},${name} where ${uninitialized}`,
    )
  return statements
}
