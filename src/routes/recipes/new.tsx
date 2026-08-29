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
import { getGear } from '@/lib/server/gear'
import { getGearSets } from '@/lib/server/gear-sets'

export const Route = createFileRoute('/recipes/new')({
  loader: async () => {
    const [beans, methods, gear, gearSets] = await Promise.all([
      getActiveBeans(),
      getBrewingMethods(),
      getGear(),
      getGearSets(),
    ])
    return { beans, methods, gear, gearSets }
  },
  component: NewRecipePage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})

function NewRecipePage() {
  const { beans, methods, gear, gearSets } = Route.useLoaderData()
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
        onCreated={async (recipe) => {
          await router.invalidate()
          await navigate({
            to: '/recipes/$recipeId',
            params: { recipeId: String(recipe.id) },
          })
        }}
        onCancel={() => navigate({ to: '/recipes' })}
      />
    </Page>
  )
}
