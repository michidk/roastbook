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
import { getRecipe } from '@/lib/server/recipes'
import { getDrinkTypeSuggestions } from '@/lib/server/suggestions'
import { canUseOfflineCache } from '@/modules/offline/errors'
import { RecipeDetailPage } from '@/routes/recipes/-components/recipe-detail-page'

type RecipeDetailData = Awaited<ReturnType<typeof loadRecipeDetail>>
type RecipeDetailLoaderData = RecipeDetailData & {
  readonly offlineSnapshotSavedAt?: string
}

async function loadRecipeDetail(recipeId: number) {
  const [recipe, beans, methods, gear, drinks, drinkTypeSuggestions] =
    await Promise.all([
      getRecipe({ data: recipeId }),
      getActiveBeans(),
      getBrewingMethods(),
      getGear(),
      getDrinkConfiguration(),
      getDrinkTypeSuggestions(),
    ])
  return { recipe, beans, methods, gear, drinks, drinkTypeSuggestions }
}

export const Route = createFileRoute('/recipes/$recipeId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loader: async ({ params }): Promise<RecipeDetailLoaderData> => {
    const recipeId = parseIdParam(params.recipeId)

    try {
      return await loadRecipeDetail(recipeId)
    } catch (error) {
      if (!canUseOfflineCache(error)) throw error

      try {
        const { readCachedEntityDetail } = await import(
          '@/modules/offline/entity-detail-cache'
        )
        const cached = await readCachedEntityDetail<RecipeDetailData>(
          'recipe',
          recipeId,
        )
        if (cached) {
          return { ...cached.data, offlineSnapshotSavedAt: cached.savedAt }
        }
      } catch {
        // Fall through to the original loader error when the cache is
        // unavailable or corrupt.
      }

      throw error
    }
  },
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})
