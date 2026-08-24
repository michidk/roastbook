import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BrewingMethodEditor } from '@/components/brewing-methods/brewing-method-editor'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import {
  deleteBrewingMethod,
  getBrewingMethod,
} from '@/lib/server/brewing-methods'

export const Route = createFileRoute('/brewing-methods/$brewingMethodId')({
  loader: ({ params }) =>
    getBrewingMethod({ data: Number(params.brewingMethodId) }),
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
  const method = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  if (!method) {
    return (
      <Page width="form">
        <div className="py-12 text-center">
          <h2 className="font-display text-xl font-bold">
            Brewing method not found
          </h2>
          <Button asChild className="mt-4">
            <Link to="/brewing-methods">Back to brewing methods</Link>
          </Button>
        </div>
      </Page>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteBrewingMethod({ data: method.id })
      await router.invalidate()
      toast.success('Brewing method deleted')
      await navigate({ to: '/brewing-methods' })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not delete brewing method',
      )
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
      <BrewingMethodEditor method={method} />
    </Page>
  )
}
