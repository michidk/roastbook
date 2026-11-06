import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { WideDetailPending } from '@/components/route-pending'

import { getBean } from '@/journal/beans'
import { getRoasters } from '@/journal/roasters'
import { getBeanShotAnalytics, getBeanShotPage } from '@/journal/shots'
import { integrationCapability } from '@/lib/client/integration-capability'
import { checkResearchEnabled, checkVisionEnabled } from '@/lib/client/research'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
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
    recommendation,
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
    integrationCapability(checkShotRecommendationEnabled)(),
  ])
  return {
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled: visionEnabled.enabled,
    researchEnabled: researchEnabled.enabled,
    recommendationEnabled: recommendation.enabled,
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
  pendingComponent: WideDetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})
