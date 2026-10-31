import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import {
  checkResearchEnabled,
  checkVisionEnabled,
  getBean,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import { getBeanShotAnalytics, getBeanShotPage } from '@/lib/server/shots'
import { canUseOfflineCache } from '@/modules/offline/errors'
import { BeanDetailPage } from '@/routes/beans/-components/bean-detail-page'

type BeanDetailSearch = {
  readonly brewPage: number
  readonly brewSort: 'date' | 'bean' | 'dose' | 'yield' | 'time' | 'rating'
  readonly brewDirection: 'asc' | 'desc'
}

type BeanDetailData = Awaited<ReturnType<typeof loadBeanDetail>>
type BeanDetailLoaderData = BeanDetailData & {
  readonly offlineSnapshotSavedAt?: string
}

function parseBeanDetailSearch(input: unknown) {
  const search = searchRecord(input)
  return {
    ...parseEditModeSearch(search),
    brewPage: searchInteger(search.brewPage, 1, 1, 100_000) ?? 1,
    brewSort: searchEnum(
      search.brewSort,
      ['date', 'bean', 'dose', 'yield', 'time', 'rating'],
      'date',
    ),
    brewDirection: searchEnum(search.brewDirection, ['asc', 'desc'], 'desc'),
  }
}

async function loadBeanDetail(beanId: number, deps: BeanDetailSearch) {
  const [
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled,
    researchEnabled,
  ] = await Promise.all([
    getBean({ data: beanId }),
    getBeanShotPage({
      data: {
        entityId: beanId,
        page: deps.brewPage,
        sort: deps.brewSort,
        direction: deps.brewDirection,
      },
    }),
    getBeanShotAnalytics({ data: beanId }),
    getRoasters(),
    checkVisionEnabled(),
    checkResearchEnabled(),
  ])
  return {
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled: visionEnabled.enabled,
    researchEnabled: researchEnabled.enabled,
  }
}

export const Route = createFileRoute('/beans/$beanId')({
  validateSearch: searchValidator(parseBeanDetailSearch),
  search: {
    middlewares: [
      stripSearchParams({
        brewPage: 1,
        brewSort: 'date',
        brewDirection: 'desc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    brewPage: search.brewPage,
    brewSort: search.brewSort,
    brewDirection: search.brewDirection,
  }),
  loader: async ({ params, deps }): Promise<BeanDetailLoaderData> => {
    const beanId = parseIdParam(params.beanId)

    try {
      return await loadBeanDetail(beanId, deps)
    } catch (error) {
      if (!canUseOfflineCache(error)) throw error

      try {
        const { readCachedEntityDetail } = await import(
          '@/modules/offline/entity-detail-cache'
        )
        const cached = await readCachedEntityDetail<
          BeanDetailData & { readonly query?: BeanDetailSearch }
        >('bean', beanId)
        if (cached) {
          const query = cached.data.query
          if (
            query &&
            (query.brewPage !== deps.brewPage ||
              query.brewSort !== deps.brewSort ||
              query.brewDirection !== deps.brewDirection)
          ) {
            throw error
          }
          return { ...cached.data, offlineSnapshotSavedAt: cached.savedAt }
        }
      } catch {
        // Fall through to the original loader error when the cache is
        // unavailable or corrupt.
      }

      throw error
    }
  },
  component: BeanDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})
