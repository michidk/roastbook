import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  beans,
  brewingMethods,
  coffeeShops,
  gear,
  roasters,
  shots,
} from '@/db/schema'
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
export const searchCommandEntities = createServerFn({ method: 'GET' })
  .validator(commandSearchSchema)
  .handler(async ({ data }): Promise<CommandEntitySearchResults> => {
    const brewPattern = escapedContainsPattern(
      commandEntitySearchTerm(data.query, ['brew', 'brews', 'shot', 'shots']),
    )
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

    const [brewRows, beanRows, cafeRows, gearRows] = await Promise.all([
      db
        .select({
          id: shots.id,
          brewedAt: shots.brewedAt,
          bean: beans.name,
          method: brewingMethods.name,
          notes: shots.notes,
        })
        .from(shots)
        .leftJoin(beans, eq(shots.beanId, beans.id))
        .innerJoin(brewingMethods, eq(shots.brewingMethodId, brewingMethods.id))
        .where(
          or(
            ilike(beans.name, brewPattern),
            ilike(brewingMethods.name, brewPattern),
            ilike(shots.notes, brewPattern),
            sql`${shots.id}::text ilike ${brewPattern}`,
            sql`${shots.brewedAt}::text ilike ${brewPattern}`,
          ),
        )
        .orderBy(desc(shots.brewedAt), desc(shots.id))
        .limit(COMMAND_SEARCH_RESULT_LIMIT),
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
            ilike(beans.name, beanPattern),
            ilike(beans.roaster, beanPattern),
            ilike(roasters.name, beanPattern),
            ilike(beans.origin, beanPattern),
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
            ilike(coffeeShops.name, cafePattern),
            ilike(coffeeShops.city, cafePattern),
            ilike(coffeeShops.country, cafePattern),
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
            ilike(gear.name, gearPattern),
            ilike(gear.brand, gearPattern),
            ilike(gear.model, gearPattern),
            sql`${gear.type}::text ilike ${gearPattern}`,
          ),
        )
        .orderBy(asc(gear.isArchived), asc(gear.name), asc(gear.id))
        .limit(COMMAND_SEARCH_RESULT_LIMIT),
    ])

    const brewResults: readonly CommandEntitySearchResult[] = brewRows.map(
      (brew) => ({
        id: brew.id,
        label: brew.bean ?? `Brew #${brew.id}`,
        description: `${brew.method} · ${brew.brewedAt.toISOString().slice(0, 10)} · #${brew.id}`,
        keywords: compactKeywords([
          'brew',
          `brew ${brew.id}`,
          `#${brew.id}`,
          brew.bean,
          brew.method,
          brew.notes,
        ]),
      }),
    )
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
      brews: brewResults,
      beans: beanResults,
      cafes: cafeResults,
      gear: gearResults,
    }
  })
