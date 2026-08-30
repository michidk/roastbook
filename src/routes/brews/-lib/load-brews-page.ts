import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getShotGroups, getShotPage } from '@/lib/server/shots'
import type { BrewsSearch } from '@/routes/brews/-lib/brews-search'

export async function loadBrewsPage(deps: BrewsSearch) {
  if (deps.view === 'grouped') {
    const [methods, result] = await Promise.all([
      getBrewingMethods(),
      getShotGroups({
        data: {
          page: deps.page,
          methodId: deps.methodId,
          rating: deps.rating,
        },
      }),
    ])
    return { view: 'grouped' as const, result, methods }
  }

  const [methods, result] = await Promise.all([
    getBrewingMethods(),
    getShotPage({
      data: {
        page: deps.page,
        sort: deps.sort,
        direction: deps.direction,
        methodId: deps.methodId,
        rating: deps.rating,
        beanId: deps.beanId,
      },
    }),
  ])
  return { view: 'list' as const, result, methods }
}

export type BrewsPageData = Awaited<ReturnType<typeof loadBrewsPage>>
