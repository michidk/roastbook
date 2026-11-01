import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { loadEntityDetail } from '@/lib/client/cached-reads'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getRecipe } from '@/lib/server/recipes'
import { getDrinkTypeSuggestions } from '@/lib/server/suggestions'
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

    return loadEntityDetail({
      entityType: 'recipe',
      id: recipeId,
      load: () => loadRecipeDetail(recipeId),
    })
  },
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})
