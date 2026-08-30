import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getRecipeOptions } from '@/lib/server/recipes'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import { getShot } from '@/lib/server/shots'
import { getTasteTags } from '@/lib/server/taste-tags'
import { BrewDetailPage } from '@/routes/brews/-components/brew-detail-page'

export const Route = createFileRoute('/brews/$shotId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loaderDeps: ({ search }) => ({ edit: search.edit ?? false }),
  loader: async ({ params, deps }) => {
    const shotId = parseIdParam(params.shotId)
    const [shot, recipes, editData, recommendation] = await Promise.all([
      getShot({ data: shotId }),
      getRecipeOptions(),
      deps.edit
        ? Promise.all([
            getActiveBeans(),
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
      checkShotRecommendationEnabled(),
    ])
    return {
      shot,
      recipes,
      editData,
      recommendationEnabled: recommendation.enabled,
    }
  },
  component: BrewDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/brews" backLabel="Back to brews" />
  ),
})
