import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BrewingMethodEditor } from '@/components/brewing-methods/brewing-method-editor'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { EntityNotFound } from '@/components/entity-not-found'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/error-message'
import { parseIdParam } from '@/lib/route-params'
import {
  deleteBrewingMethod,
  getBrewingMethod,
} from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'

export const Route = createFileRoute('/brewing-methods/$brewingMethodId')({
  loader: async ({ params }) => {
    const [method, drinks] = await Promise.all([
      getBrewingMethod({ data: parseIdParam(params.brewingMethodId) }),
      getDrinkConfiguration(),
    ])
    return { method, drinks }
  },
  component: BrewingMethodDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      backTo="/brewing-methods"
      backLabel="Back to brewing methods"
    />
  ),
})

function BrewingMethodDetailPage() {
  const { method, drinks } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  if (!method) {
    return (
      <EntityNotFound
        entity="Brewing method"
        backTo="/brewing-methods"
        backLabel="Back to brewing methods"
      />
    )
  }

  const handleDelete = async () => {
    try {
      await deleteBrewingMethod({ data: method.id })
      await router.invalidate()
      toast.success('Brewing method deleted')
      await navigate({ to: '/brewing-methods' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete brewing method'))
    }
  }

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={method.name}
        description={method.description ?? undefined}
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/brewing-methods" aria-label="Back to brewing methods">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <DeleteConfirmation
            title={`Delete ${method.name}?`}
            description="Methods used by shots or recipes cannot be deleted."
            onConfirm={handleDelete}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        }
      />
      <BrewingMethodEditor method={method} drinkTypes={drinks.drinkTypes} />
    </Page>
  )
}
