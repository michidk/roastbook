import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'

import { getActiveBeans } from '@/journal/beans'
import { getBrewingMethods } from '@/journal/brewing-methods'
import { getDrinkConfiguration } from '@/journal/drink-options'
import { getGear } from '@/journal/gear'
import { getRecipe } from '@/journal/recipes'
import { getDrinkTypeSuggestions } from '@/journal/suggestions'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { RecipeDetailPage } from '@/routes/recipes/-components/recipe-detail-page'

type RecipeDetailData = Awaited<ReturnType<typeof loadRecipeDetail>>
type RecipeDetailLoaderData = RecipeDetailData & {}

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

    return (() => loadRecipeDetail(recipeId))()
  },
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})
