import { asc, eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { beanPurchases, beans, coffeeShops, gear, roasters } from '@/db/schema'
import { journalRead } from '@/journal/function'
import { db, owned } from '@/journal/platform/database'
import { escapedContainsPattern } from '@/lib/collection-query'
import type {
  CommandEntitySearchResult,
  CommandEntitySearchResults,
} from '@/lib/command-search-contract'
import { commandEntitySearchTerm } from '@/lib/command-search-contract'

const COMMAND_SEARCH_RESULT_LIMIT = 5
const commandSearchSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

function compactKeywords(
  values: readonly (string | null)[],
): readonly string[] {
  return values.filter((value): value is string => Boolean(value))
}

/** Searches the entity collections exposed by the global command menu. */
export const searchCommandEntities = journalRead(
  'command-search/searchCommandEntities',
)
  .validator(commandSearchSchema)
  .handler(async ({ data }): Promise<CommandEntitySearchResults> => {
    const beanPattern = escapedContainsPattern(
      commandEntitySearchTerm(data.query, ['bean', 'beans']),
    )
    const cafePattern = escapedContainsPattern(
      commandEntitySearchTerm(data.query, [
        'cafe',
        'cafes',
        'café',
        'cafés',
        'cafee',
        'cafees',
      ]),
    )
    const gearPattern = escapedContainsPattern(
      commandEntitySearchTerm(data.query, ['gear', 'equipment']),
    )

    const [beanRows, cafeRows, gearRows] = await Promise.all([
      db
        .select({
          id: beans.id,
          label: beans.name,
          roaster: sql<
            string | null
          >`coalesce(${roasters.name}, ${beans.roaster})`,
          origin: beans.origin,
        })
        .from(beans)
        .leftJoin(roasters, eq(beans.roasterId, roasters.id))
        .where(
          owned(
            beans,
            or(
              sql`lower(${beans.name}) like lower(${beanPattern}) escape ${'\\'}`,
              sql`lower(${beans.roaster}) like lower(${beanPattern}) escape ${'\\'}`,
              sql`lower(${roasters.name}) like lower(${beanPattern}) escape ${'\\'}`,
              sql`lower(${beans.origin}) like lower(${beanPattern}) escape ${'\\'}`,
            ),
          ),
        )
        .orderBy(
          sql`not exists (select 1 from ${beanPurchases} where ${owned(beanPurchases)} and ${beanPurchases.beanId} = ${beans.id} and ${beanPurchases.isArchived} = false)`,
          asc(beans.name),
          asc(beans.id),
        )
        .limit(COMMAND_SEARCH_RESULT_LIMIT),
      db
        .select({
          id: coffeeShops.id,
          label: coffeeShops.name,
          city: coffeeShops.city,
          country: coffeeShops.country,
        })
        .from(coffeeShops)
        .where(
          owned(
            coffeeShops,
            or(
              sql`lower(${coffeeShops.name}) like lower(${cafePattern}) escape ${'\\'}`,
              sql`lower(${coffeeShops.city}) like lower(${cafePattern}) escape ${'\\'}`,
              sql`lower(${coffeeShops.country}) like lower(${cafePattern}) escape ${'\\'}`,
            ),
          ),
        )
        .orderBy(asc(coffeeShops.name), asc(coffeeShops.id))
        .limit(COMMAND_SEARCH_RESULT_LIMIT),
      db
        .select({
          id: gear.id,
          label: gear.name,
          brand: gear.brand,
          model: gear.model,
          type: gear.type,
        })
        .from(gear)
        .where(
          owned(
            gear,
            or(
              sql`lower(${gear.name}) like lower(${gearPattern}) escape ${'\\'}`,
              sql`lower(${gear.brand}) like lower(${gearPattern}) escape ${'\\'}`,
              sql`lower(${gear.model}) like lower(${gearPattern}) escape ${'\\'}`,
              sql`lower(cast(${gear.type} as text)) like lower(${gearPattern}) escape ${'\\'}`,
            ),
          ),
        )
        .orderBy(asc(gear.isArchived), asc(gear.name), asc(gear.id))
        .limit(COMMAND_SEARCH_RESULT_LIMIT),
    ])

    const beanResults: readonly CommandEntitySearchResult[] = beanRows.map(
      (bean) => ({
        id: bean.id,
        label: bean.label,
        description:
          compactKeywords([bean.roaster, bean.origin]).join(' · ') || null,
        keywords: compactKeywords([bean.roaster, bean.origin]),
      }),
    )
    const cafeResults: readonly CommandEntitySearchResult[] = cafeRows.map(
      (cafe) => ({
        id: cafe.id,
        label: cafe.label,
        description:
          compactKeywords([cafe.city, cafe.country]).join(', ') || null,
        keywords: compactKeywords([cafe.city, cafe.country]),
      }),
    )
    const gearResults: readonly CommandEntitySearchResult[] = gearRows.map(
      (item) => ({
        id: item.id,
        label: item.label,
        description: item.type,
        keywords: compactKeywords([item.brand, item.model, item.type]),
      }),
    )

    return {
      beans: beanResults,
      cafes: cafeResults,
      gear: gearResults,
    }
  })
