import type { JournalState } from '@roastbook/journal-domain/state'
import { z } from 'zod'
import { resolvePagination } from '@/lib/collection-query'
import { commandEntitySearchTerm } from '@/lib/command-search-contract'
import { positiveIdSchema } from '@/lib/server-validation'
import { dateKeyInTimeZone } from '@/lib/stats-filters'
import { tasteProfileConfigFrom } from '@/lib/taste-profile'
import { LEGACY_SENSORY_TASTE_TAG_NAMES } from '@/lib/taste-tags'
import { beanListSchema } from './beans-input'
import { brewingMethodListSchema } from './brewing-methods-input'
import { cafeVisitListSchema } from './cafe-visits-input'
import { coffeeShopListSchema } from './coffee-shops-input'
import { gearListSchema } from './gear-input'
import { gearSetListSchema } from './gear-sets-input'
import { roasterListSchema } from './roasters-input'
import { detailedLocalStats } from './statistics'
import { journalSuggestions } from './suggestions'
import { JournalViews } from './views'

const listSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})
const shotListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  methodId: positiveIdSchema.optional(),
  rating: z.number().int().min(0).max(5).optional(),
  beanId: z.number().int().min(0).optional(),
})
function contains(query: string, ...values: (string | null | undefined)[]) {
  return values.some((value) =>
    value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
}
function page<T>(items: T[], requested: number, size: number) {
  const pagination = resolvePagination(items.length, requested, size)
  return {
    items: items.slice((pagination.page - 1) * size, pagination.page * size),
    ...pagination,
  }
}
function compare(a: unknown, b: unknown) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b))
}
function sort<T extends { id: number }>(
  rows: T[],
  key: (row: T) => unknown,
  direction: 'asc' | 'desc' = 'asc',
  tieDirection: 'asc' | 'desc' = 'asc',
) {
  return [...rows].sort(
    (a, b) =>
      (direction === 'asc' ? 1 : -1) * compare(key(a), key(b)) ||
      (tieDirection === 'asc' ? a.id - b.id : b.id - a.id),
  )
}
type ReadContext = { view: JournalViews; state: JournalState; now: Date }
function read<S extends z.ZodType, R>(
  schema: S,
  run: (context: ReadContext, data: z.output<S>) => R,
) {
  return (context: ReadContext, input: unknown) =>
    run(context, schema.parse(input))
}
const none = z.unknown()
function filteredShots(
  { view, state }: ReadContext,
  data: z.infer<typeof shotListSchema>,
) {
  const profile = tasteProfileConfigFrom(
    state.tables.settings[0]?.tasteProfileFields ?? [],
  )
  const rating = profile.overallRating ? data.rating : undefined
  const sortKey =
    data.sort === 'rating' && !profile.overallRating ? 'date' : data.sort
  const shots = view
    .shots()
    .filter(
      (shot) =>
        (!data.methodId || shot.brewingMethodId === data.methodId) &&
        (rating === undefined ||
          (rating === 0 ? shot.rating === null : shot.rating === rating)) &&
        (data.beanId === undefined ||
          (data.beanId === 0
            ? shot.beanId === null
            : shot.beanId === data.beanId)),
    )
  return sort(
    shots,
    (shot) =>
      sortKey === 'bean'
        ? (shot.bean?.name ?? '')
        : sortKey === 'dose'
          ? nullableNumber(shot.doseGrams)
          : sortKey === 'yield'
            ? nullableNumber(shot.yieldGrams)
            : sortKey === 'time'
              ? nullableNumber(shot.shotTimeSeconds)
              : sortKey === 'rating'
                ? shot.rating
                : shot.brewedAt,
    data.direction,
    'desc',
  )
}
function nullableNumber(value: string | null) {
  return value === null ? null : Number(value)
}
const recipeListSchema = listSchema.extend({
  sort: z.enum(['name', 'updated']).default('updated'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

export const journalReads = {
  ...journalSuggestions,
  'beans/getBeans': read(none, ({ view }) =>
    sort(view.beans(), (row) => row.createdAt, 'desc'),
  ),
  'beans/getActiveBeans': read(none, ({ view }) =>
    view
      .beans()
      .filter((bean) =>
        bean.purchases.some((purchase) => !purchase.isArchived),
      ),
  ),
  'beans/getActiveBeanPurchases': read(none, ({ view }) =>
    view.activePurchases(),
  ),
  'beans/getBean': read(positiveIdSchema, ({ view }, id) =>
    view.beans().find((bean) => bean.id === id),
  ),
  'beans/getBeanCollection': read(beanListSchema, ({ view }, data) => {
    const rows = sort(
      view
        .beans()
        .filter(
          (bean) =>
            !data.query ||
            contains(
              data.query,
              bean.name,
              bean.origin,
              bean.roasterRef?.name ?? bean.roaster,
            ),
        ),
      (bean) => bean.createdAt,
      'desc',
    )
    const active = page(
      rows.filter((bean) =>
        bean.purchases.some((purchase) => !purchase.isArchived),
      ),
      data.activePage,
      12,
    )
    const archived = page(
      rows.filter(
        (bean) => !bean.purchases.some((purchase) => !purchase.isArchived),
      ),
      data.archivedPage,
      24,
    )
    return {
      active,
      archived,
      totalItems: rows.length,
      totalBags: rows.reduce((sum, bean) => sum + bean.purchases.length, 0),
    }
  }),
  'roasters/getRoasters': read(none, ({ view }) =>
    view.all('roasters').map((roaster) => ({
      ...roaster,
      beans: view.all('beans').filter((bean) => bean.roasterId === roaster.id),
    })),
  ),
  'roasters/getRoaster': read(positiveIdSchema, ({ view }, id) => {
    const roaster = view.find('roasters', id)
    return roaster
      ? {
          ...roaster,
          beans: view.all('beans').filter((bean) => bean.roasterId === id),
        }
      : undefined
  }),
  'roasters/getRoasterPage': read(roasterListSchema, ({ view }, data) =>
    page(
      sort(
        view
          .all('roasters')
          .filter((row) => !data.query || contains(data.query, row.name))
          .map((row) => ({
            ...row,
            beanCount: view.tables.beans.filter(
              (bean) => bean.roasterId === row.id,
            ).length,
          })),
        (row) =>
          data.sort === 'beans'
            ? row.beanCount
            : data.sort === 'location'
              ? `${row.location ?? ''}${row.country ?? ''}`
              : row.name,
        data.direction,
      ),
      data.page,
      25,
    ),
  ),
  'coffee-shops/getCoffeeShops': read(none, ({ view }) => view.places()),
  'coffee-shops/getCoffeeShopMapOverview': read(none, ({ view }) =>
    sortPlaces(view.places()),
  ),
  'coffee-shops/getCoffeeShop': read(positiveIdSchema, ({ view }, id) =>
    view.places().find((place) => place.id === id),
  ),
  'coffee-shops/getCoffeeShopPage': read(
    coffeeShopListSchema,
    ({ view }, data) => {
      const all = view.places()
      const rows = all.filter(
        (row) =>
          (!data.query ||
            contains(data.query, row.name, row.city, row.country)) &&
          (data.list === 'all' ||
            (data.list === 'favorites' ? row.isFavorite : row.wantsToVisit)),
      )
      return {
        ...page(sortPlaces(rows), data.page, 18),
        listCounts: {
          all: all.length,
          favorites: all.filter((row) => row.isFavorite).length,
          wantToVisit: all.filter((row) => row.wantsToVisit).length,
        },
      }
    },
  ),
  'cafe-visits/getCafeVisits': read(none, ({ view }) =>
    sort(view.visits(), (row) => row.visitedAt, 'desc'),
  ),
  'cafe-visits/getCafeVisit': read(positiveIdSchema, ({ view }, id) =>
    view.visits().find((visit) => visit.id === id),
  ),
  'cafe-visits/getCafeVisitPage': read(cafeVisitListSchema, ({ view }, data) =>
    page(
      sort(
        view
          .visits()
          .filter(
            (row) =>
              !data.query ||
              contains(
                data.query,
                row.drinkType?.name,
                row.bean?.name,
                row.coffeeShop?.name,
              ),
          ),
        (row) => row.visitedAt,
        'desc',
      ),
      data.page,
      18,
    ),
  ),
  'gear/getGear': read(none, ({ view }) =>
    sort(view.gear(), (row) => row.createdAt, 'desc'),
  ),
  'gear/getGearById': read(positiveIdSchema, ({ view }, id) =>
    view.gear().find((row) => row.id === id),
  ),
  'gear/getGearPage': read(gearListSchema, ({ view }, data) => {
    const rows = sort(
      view
        .gear()
        .filter(
          (row) =>
            !data.query || contains(data.query, row.name, row.brand, row.model),
        ),
      (row) =>
        data.sort === 'name'
          ? row.name
          : data.sort === 'type'
            ? row.type
            : row.createdAt,
      data.direction,
    )
    return {
      active: page(
        rows.filter((row) => !row.isArchived),
        data.activePage,
        12,
      ),
      archived: page(
        rows.filter((row) => row.isArchived),
        data.archivedPage,
        12,
      ),
      totalItems: rows.length,
    }
  }),
  'gear-sets/getGearSets': read(none, ({ view }) =>
    sort(view.gearSets(), (row) => row.name),
  ),
  'gear-sets/getGearSetById': read(
    positiveIdSchema,
    ({ view }, id) => view.gearSets().find((row) => row.id === id) ?? null,
  ),
  'gear-sets/getGearSetPage': read(gearSetListSchema, ({ view }, data) =>
    page(
      sort(
        view
          .gearSets()
          .filter((row) => !data.query || contains(data.query, row.name)),
        (row) => (data.sort === 'added' ? row.createdAt : row.name),
        data.direction,
      ),
      data.page,
      12,
    ),
  ),
  'brewing-methods/getBrewingMethods': read(none, ({ view }) => view.methods()),
  'brewing-methods/getBrewingMethod': read(positiveIdSchema, ({ view }, id) =>
    view.methods().find((row) => row.id === id),
  ),
  'brewing-methods/getBrewingMethodPage': read(
    brewingMethodListSchema,
    ({ view }, data) =>
      page(
        sort(
          view
            .methods()
            .filter(
              (row) =>
                !data.query || contains(data.query, row.name, row.description),
            )
            .map((row) => ({
              ...row,
              recipeCount: view.tables.recipes.filter(
                (recipe) => recipe.brewingMethodId === row.id,
              ).length,
              shotCount: view.tables.shots.filter(
                (shot) => shot.brewingMethodId === row.id,
              ).length,
            })),
          (row) => row.name,
        ),
        data.page,
        24,
      ),
  ),
  'drink-options/getDrinkConfiguration': read(none, ({ view }) => ({
    drinkTypes: sort(
      view
        .all('drinkTypes')
        .filter((row) => !row.isArchived)
        .map((row) => ({
          ...row,
          optionGroupIds: view.tables.drinkTypeOptionGroups
            .filter((link) => link.drinkTypeId === row.id)
            .map((link) => link.optionGroupId),
        })),
      (row) => row.name,
    ),
    optionGroups: sort(
      view
        .all('drinkOptionGroups')
        .filter((row) => !row.isArchived)
        .map((group) => ({
          ...group,
          values: sort(
            view
              .all('drinkOptionValues')
              .filter(
                (value) => value.groupId === group.id && !value.isArchived,
              ),
            (value) => value.name,
          ),
        })),
      (group) => group.name,
    ),
  })),
  'taste-tags/getTasteTags': read(none, ({ view }) =>
    sort(view.all('tasteTags'), (row) => row.name),
  ),
  'recipes/getRecipes': read(none, ({ view }) =>
    sort(view.recipes(), (row) => row.updatedAt, 'desc'),
  ),
  'recipes/getRecipeOptions': read(none, ({ view }) =>
    sort(view.recipes(), (row) => row.name).map(
      ({ id, name, brewingMethodId }) => ({ id, name, brewingMethodId }),
    ),
  ),
  'recipes/getRecipe': read(positiveIdSchema, ({ view }, id) =>
    view.recipes().find((row) => row.id === id),
  ),
  'recipes/getRecipePage': read(recipeListSchema, ({ view }, data) =>
    page(
      sort(
        view
          .recipes()
          .filter(
            (row) =>
              !data.query ||
              contains(
                data.query,
                row.name,
                row.bean?.name,
                row.brewingMethod?.name,
              ),
          ),
        (row) => (data.sort === 'name' ? row.name : row.updatedAt),
        data.direction,
      ),
      data.page,
      24,
    ),
  ),
  'shots/getShot': read(positiveIdSchema, ({ view }, id) =>
    view.shots().find((row) => row.id === id),
  ),
  'shots/getShotPage': read(shotListSchema, (context, data) => ({
    ...page(filteredShots(context, data), data.page, 12),
    scopeLabel:
      data.beanId === undefined
        ? null
        : data.beanId === 0
          ? 'No bean recorded'
          : (context.view.find('beans', data.beanId)?.name ?? 'Unknown beans'),
  })),
  'shots/getBeanShotPage': read(
    shotListSchema.extend({ entityId: positiveIdSchema }),
    (context, data) =>
      page(
        filteredShots(context, { ...data, beanId: data.entityId }),
        data.page,
        12,
      ),
  ),
  'shots/getGearShotPage': read(
    shotListSchema.extend({ entityId: positiveIdSchema }),
    (context, data) =>
      page(
        filteredShots(context, data).filter(
          (row) =>
            row.machineId === data.entityId ||
            row.grinderId === data.entityId ||
            row.basketId === data.entityId ||
            row.accessoryGearIds.includes(data.entityId),
        ),
        data.page,
        12,
      ),
  ),
  'shots/getLastShotForBeanAndMethod': read(
    z.object({ beanId: positiveIdSchema, brewingMethodId: positiveIdSchema }),
    ({ view }, data) =>
      sort(
        view
          .shots()
          .filter(
            (row) =>
              row.beanId === data.beanId &&
              row.brewingMethodId === data.brewingMethodId,
          ),
        (row) => row.brewedAt,
        'desc',
      )[0] ?? null,
  ),
  'shots/getBeanShotAnalytics': read(positiveIdSchema, ({ view }, id) => {
    const shots = sort(
      view.shots().filter((row) => row.beanId === id),
      (row) => row.brewedAt,
      'desc',
    )
    const tags = view
      .all('tasteTags')
      .map((tag) => ({
        ...tag,
        usageCount: shots.filter((shot) =>
          shot.tasteTags.some((link) => link.tasteTagId === tag.id),
        ).length,
      }))
      .filter(
        (tag) =>
          tag.usageCount > 0 &&
          !LEGACY_SENSORY_TASTE_TAG_NAMES.some((name) => name === tag.name),
      )
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
    return {
      totalShots: shots.length,
      usedWeightGrams: shots.length
        ? shots
            .reduce((sum, shot) => sum + Number(shot.doseGrams ?? 0), 0)
            .toFixed(2)
        : '0',
      chartShots: shots.slice(0, 100),
      topTasteTags: tags,
    }
  }),
  'shots/getShotGroups': read(shotListSchema, (context, data) => {
    const shots = filteredShots(context, {
      ...data,
      sort: 'date',
      direction: 'desc',
    })
    const keys = [...new Set(shots.map((row) => row.beanId))]
    const groups = keys.map((id) => {
      const rows = shots.filter((row) => row.beanId === id)
      return {
        key: id ? `bean-${id}` : 'no-bean',
        bean: context.view.find('beans', id),
        label: context.view.find('beans', id)?.name ?? 'No bean recorded',
        totalShots: rows.length,
        shots: rows.slice(0, 12),
      }
    })
    const result = page(groups, data.page, 8)
    return {
      groups: result.items,
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  }),
  'stats/getDashboardStats': read(none, ({ view, state, now }) => {
    const today = dateKeyInTimeZone(
      now,
      state.tables.settings[0]?.timeZone ?? 'UTC',
    )
    return {
      totalShots: view.tables.shots.length,
      activeBeans: view.tables.beanPurchases.filter((row) => !row.isArchived)
        .length,
      shotsThisMonth: view.all('shots').filter((row) => {
        const date = dateKeyInTimeZone(
          row.brewedAt,
          state.tables.settings[0]?.timeZone ?? 'UTC',
        )
        return date >= `${today.slice(0, 7)}-01` && date <= today
      }).length,
      cafeVisits: view.tables.cafeVisits.length,
      coffeeShops: view.tables.coffeeShops.length,
    }
  }),
  'stats/getRecentShots': read(
    z.number().int().min(1).max(50).default(5),
    ({ view }, limit) =>
      sort(view.shots(), (row) => row.brewedAt, 'desc').slice(0, limit),
  ),
  'stats/getDetailedStats': (context: ReadContext, input: unknown) =>
    detailedLocalStats(context.view, input, context.now),
  'command-search/searchCommandEntities': read(
    z.object({ query: z.string().trim().min(1).max(100) }),
    ({ view }, data) => {
      const compact = (values: (string | null | undefined)[]) =>
        values.filter((value): value is string => Boolean(value))
      const beans = view
        .beans()
        .filter((row) =>
          contains(
            commandEntitySearchTerm(data.query, ['bean', 'beans']),
            row.name,
            row.roasterRef?.name,
            row.roaster,
            row.origin,
          ),
        )
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          label: row.name,
          description:
            compact([row.roasterRef?.name ?? row.roaster, row.origin]).join(
              ' · ',
            ) || null,
          keywords: compact([row.roasterRef?.name ?? row.roaster, row.origin]),
        }))
      const cafes = view
        .places()
        .filter((row) =>
          contains(
            commandEntitySearchTerm(data.query, [
              'cafe',
              'cafes',
              'café',
              'cafés',
              'cafee',
              'cafees',
            ]),
            row.name,
            row.city,
            row.country,
          ),
        )
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          label: row.name,
          description: compact([row.city, row.country]).join(', ') || null,
          keywords: compact([row.city, row.country]),
        }))
      const gear = view
        .gear()
        .filter((row) =>
          contains(
            commandEntitySearchTerm(data.query, ['gear', 'equipment']),
            row.name,
            row.brand,
            row.model,
            row.type,
          ),
        )
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          label: row.name,
          description: row.type,
          keywords: compact([row.brand, row.model, row.type]),
        }))
      return { beans, cafes, gear }
    },
  ),
}

function sortPlaces<
  T extends {
    isFavorite: boolean
    wantsToVisit: boolean
    latestVisitAt: Date | null
    name: string
  },
>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      Number(b.isFavorite) - Number(a.isFavorite) ||
      Number(b.wantsToVisit) - Number(a.wantsToVisit) ||
      compare(b.latestVisitAt, a.latestVisitAt) ||
      a.name.localeCompare(b.name),
  )
}
export type JournalReadOperation = keyof typeof journalReads
const readOperations: Readonly<
  Record<string, (context: ReadContext, input: unknown) => unknown>
> = journalReads

export function readJournal(
  state: JournalState,
  operation: string,
  input: unknown,
  now = new Date(),
) {
  const readOperation = Object.hasOwn(readOperations, operation)
    ? readOperations[operation]
    : undefined
  if (!readOperation)
    throw new Error('This query is unavailable in the local journal')
  return readOperation(
    { view: new JournalViews(state.tables), state, now },
    input,
  )
}
