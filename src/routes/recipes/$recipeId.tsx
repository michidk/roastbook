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
import { RecipeDetailPage } from '@/routes/recipes/-components/recipe-detail-page'

export const Route = createFileRoute('/recipes/$recipeId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loader: async ({ params }) => {
    const recipeId = parseIdParam(params.recipeId)
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
  },
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})
