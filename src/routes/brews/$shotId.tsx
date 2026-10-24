import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeanPurchases } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getRecipeOptions } from '@/lib/server/recipes'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import { getShot } from '@/lib/server/shots'
import { getTasteTags } from '@/lib/server/taste-tags'
import { BrewDetailPage } from '@/routes/brews/-components/brew-detail-page'

type BrewDetailData = Awaited<ReturnType<typeof loadBrewDetail>>
type BrewDetailLoaderData = BrewDetailData & {
  readonly offlineSnapshotSavedAt?: string
}

type CachedBrewEditData = {
  readonly beans: Awaited<ReturnType<typeof getActiveBeanPurchases>>
  readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  readonly gear: Awaited<ReturnType<typeof getGear>>
  readonly methods: Awaited<ReturnType<typeof getBrewingMethods>>
  readonly drinks: Awaited<ReturnType<typeof getDrinkConfiguration>>
}

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
    checkShotRecommendationEnabled(),
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

    try {
      return await loadBrewDetail(shotId, deps.edit)
    } catch (error) {
      if (typeof window === 'undefined' || navigator.onLine) throw error

      try {
        const { readCachedBrewDetail } = await import(
          '@/modules/offline/brew-cache'
        )
        const cached = await readCachedBrewDetail<BrewDetailData>(shotId)
        if (cached) {
          let editData = cached.data.editData
          if (deps.edit && !editData) {
            try {
              const { readCachedNewBrewReferenceData } = await import(
                '@/modules/offline/reference-data'
              )
              const reference =
                await readCachedNewBrewReferenceData<CachedBrewEditData>()
              if (reference) {
                editData = {
                  beans: reference.data.beans,
                  tasteTags: reference.data.tasteTags,
                  gear: reference.data.gear,
                  methods: reference.data.methods,
                  drinks: reference.data.drinks,
                }
              }
            } catch {
              // Edit data stays unavailable; the page falls back to read-only.
            }
          }

          return {
            ...cached.data,
            editData,
            offlineSnapshotSavedAt: cached.savedAt,
          }
        }
      } catch {
        // Fall through to the original loader error when the cache is
        // unavailable or corrupt.
      }

      throw error
    }
  },
  component: BrewDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/brews" backLabel="Back to brews" />
  ),
})
