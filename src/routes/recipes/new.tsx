import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getGearSets } from '@/lib/server/gear-sets'
import { getDrinkTypeSuggestions } from '@/lib/server/suggestions'

type RecipeNewData = Awaited<ReturnType<typeof loadRecipeNewData>>
type CachedRecipeReferenceData = RecipeNewData

type CachedNewBrewReferenceData = {
  readonly beans: RecipeNewData['beans']
  readonly methods: RecipeNewData['methods']
  readonly gear: RecipeNewData['gear']
  readonly gearSets: RecipeNewData['gearSets']
  readonly drinks: RecipeNewData['drinks']
  readonly drinkTypeSuggestions: RecipeNewData['drinkTypeSuggestions']
}

async function loadRecipeNewData() {
  const [beans, methods, gear, gearSets, drinks, drinkTypeSuggestions] =
    await Promise.all([
      getActiveBeans(),
      getBrewingMethods(),
      getGear(),
      getGearSets(),
      getDrinkConfiguration(),
      getDrinkTypeSuggestions(),
    ])
  return { beans, methods, gear, gearSets, drinks, drinkTypeSuggestions }
}

export const Route = createFileRoute('/recipes/new')({
  loader: async (): Promise<CachedRecipeReferenceData> => {
    try {
      const data = await loadRecipeNewData()
      if (typeof window !== 'undefined') {
        const { writeCachedReferenceData } = await import(
          '@/modules/offline/reference-cache'
        )
        await writeCachedReferenceData('recipe-new', 1, data).catch(
          () => undefined,
        )
      }
      return data
    } catch (error) {
      if (typeof window === 'undefined' || navigator.onLine) throw error

      try {
        const { readCachedReferenceData } = await import(
          '@/modules/offline/reference-cache'
        )
        const cached = await readCachedReferenceData<CachedRecipeReferenceData>(
          'recipe-new',
          1,
        )
        if (cached) return cached.data
      } catch {
        // Fall through to the new-brew snapshot below.
      }

      try {
        const { readCachedNewBrewReferenceData } = await import(
          '@/modules/offline/reference-data'
        )
        const cached =
          await readCachedNewBrewReferenceData<CachedNewBrewReferenceData>()
        if (cached) {
          return {
            beans: cached.data.beans,
            methods: cached.data.methods,
            gear: cached.data.gear,
            gearSets: cached.data.gearSets,
            drinks: cached.data.drinks,
            drinkTypeSuggestions: cached.data.drinkTypeSuggestions,
          }
        }
      } catch {
        // Fall through to the original loader error when no snapshot exists.
      }

      throw error
    }
  },
  component: NewRecipePage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})

function NewRecipePage() {
  const { beans, methods, gear, gearSets, drinks, drinkTypeSuggestions } =
    Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <Page width="form">
      <FormPageHeader
        title="New recipe"
        description="Create reusable brew values from scratch."
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/recipes" aria-label="Back to recipes">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <RecipeForm
        beans={beans}
        methods={methods}
        gear={gear}
        gearSets={gearSets}
        drinks={drinks}
        drinkTypeSuggestions={drinkTypeSuggestions}
        onCreated={async (recipe) => {
          await router.invalidate()
          await navigate({
            to: '/recipes/$recipeId',
            params: { recipeId: String(recipe.id) },
          })
        }}
        onQueued={async () => {
          await navigate({ to: '/brews/pending' })
        }}
        onCancel={() => navigate({ to: '/recipes' })}
      />
    </Page>
  )
}
