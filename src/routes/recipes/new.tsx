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
import { useReferenceSnapshot } from '@/hooks/use-reference-snapshot'
import { loadReferenceData } from '@/lib/client/cached-reads'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getGearSets } from '@/lib/server/gear-sets'
import { getDrinkTypeSuggestions } from '@/lib/server/suggestions'

type RecipeNewData = Awaited<ReturnType<typeof loadRecipeNewData>>
type CachedRecipeReferenceData = RecipeNewData & {
  readonly offlineSnapshotSavedAt?: string
}

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
    return loadReferenceData({
      key: 'recipe-new',
      load: loadRecipeNewData,
      fallback: async () => {
        const { readCachedNewBrewReferenceData } = await import(
          '@/modules/offline/reference-data'
        )
        return readCachedNewBrewReferenceData<CachedNewBrewReferenceData>()
      },
    })
  },
  component: NewRecipePage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})

function NewRecipePage() {
  const data = Route.useLoaderData()
  useReferenceSnapshot('recipe-new', data, data.offlineSnapshotSavedAt)
  const { beans, methods, gear, gearSets, drinks, drinkTypeSuggestions } = data
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
