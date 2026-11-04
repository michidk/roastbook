import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'

import {
  checkResearchEnabled,
  checkVisionEnabled,
  getBean,
} from '@/lib/client/journal/beans'
import { getRoasters } from '@/lib/client/journal/roasters'
import {
  getBeanShotAnalytics,
  getBeanShotPage,
} from '@/lib/client/journal/shots'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import { BeanDetailPage } from '@/routes/beans/-components/bean-detail-page'

type BeanDetailSearch = {
  readonly brewPage: number
  readonly brewSort: 'date' | 'bean' | 'dose' | 'yield' | 'time' | 'rating'
  readonly brewDirection: 'asc' | 'desc'
}

type BeanDetailData = Awaited<ReturnType<typeof loadBeanDetail>>
type BeanDetailLoaderData = BeanDetailData & {}

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

    return (async () => ({
      ...(await loadBeanDetail(beanId, deps)),
      query: deps,
    }))()
  },
  component: BeanDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})
