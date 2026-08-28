import { createServerFn } from '@tanstack/react-start'
import { asc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, coffeeShops, gear, roasters } from '@/db/schema'
import { escapedContainsPattern } from '@/lib/collection-query'
import type {
  CommandEntitySearchResult,
  CommandEntitySearchResults,
} from '@/lib/command-search-contract'

const COMMAND_SEARCH_RESULT_LIMIT = 5
const commandSearchSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

function compactKeywords(
  values: readonly (string | null)[],
): readonly string[] {
  return values.filter((value): value is string => Boolean(value))
}

/** Searches the three entity collections exposed by the global command menu. */
export const searchCommandEntities = createServerFn({ method: 'GET' })
  .validator(commandSearchSchema)
  .handler(async ({ data }): Promise<CommandEntitySearchResults> => {
    const pattern = escapedContainsPattern(data.query)

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
          or(
            ilike(beans.name, pattern),
            ilike(beans.roaster, pattern),
            ilike(roasters.name, pattern),
            ilike(beans.origin, pattern),
          ),
        )
        .orderBy(asc(beans.isArchived), asc(beans.name), asc(beans.id))
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
          or(
            ilike(coffeeShops.name, pattern),
            ilike(coffeeShops.city, pattern),
            ilike(coffeeShops.country, pattern),
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
          or(
            ilike(gear.name, pattern),
            ilike(gear.brand, pattern),
            ilike(gear.model, pattern),
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

    return { beans: beanResults, cafes: cafeResults, gear: gearResults }
  })
