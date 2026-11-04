import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { integrationCapability } from '@/lib/client/integration-capability'

import { getActiveBeanPurchases } from '@/lib/client/journal/beans'
import { getBrewingMethods } from '@/lib/client/journal/brewing-methods'
import { getDrinkConfiguration } from '@/lib/client/journal/drink-options'
import { getGear } from '@/lib/client/journal/gear'
import { getRecipeOptions } from '@/lib/client/journal/recipes'
import { getShot } from '@/lib/client/journal/shots'
import { getTasteTags } from '@/lib/client/journal/taste-tags'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import { BrewDetailPage } from '@/routes/brews/-components/brew-detail-page'

type BrewDetailData = Awaited<ReturnType<typeof loadBrewDetail>>
type BrewDetailLoaderData = BrewDetailData & {}

async function loadBrewDetail(shotId: number, edit: boolean) {
  const [shot, recipes, editData, recommendation] = await Promise.all([
    getShot({ data: shotId }),
    getRecipeOptions(),
    edit
      ? Promise.all([
          getActiveBeanPurchases(),
          getTasteTags(),
          getGear(),
          getBrewingMethods(),
          getDrinkConfiguration(),
        ]).then(([beans, tasteTags, gear, methods, drinks]) => ({
          beans,
          tasteTags,
          gear,
          methods,
          drinks,
        }))
      : null,
    integrationCapability(() => checkShotRecommendationEnabled())(),
  ])
  return {
    shot,
    recipes,
    editData,
    recommendationEnabled: recommendation.enabled,
  }
}

export const Route = createFileRoute('/brews/$shotId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loaderDeps: ({ search }) => ({ edit: search.edit ?? false }),
  loader: async ({ params, deps }): Promise<BrewDetailLoaderData> => {
    const shotId = parseIdParam(params.shotId)

    return (() => loadBrewDetail(shotId, deps.edit))()
  },
  component: BrewDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/brews" backLabel="Back to brews" />
  ),
})
