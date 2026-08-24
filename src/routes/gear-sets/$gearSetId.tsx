import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { GearSetEditor } from '@/components/gear-sets/gear-set-editor'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getGear } from '@/lib/server/gear'
import { deleteGearSet, getGearSetById } from '@/lib/server/gear-sets'

export const Route = createFileRoute('/gear-sets/$gearSetId')({
  loader: async ({ params }) => {
    const [gearSet, gear] = await Promise.all([
      getGearSetById({ data: Number(params.gearSetId) }),
      getGear(),
    ])
    return { gearSet, gear }
  },
  component: GearSetDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      backTo="/gear-sets"
      backLabel="Back to gear sets"
    />
  ),
})

function GearSetDetailPage() {
  const { gearSet, gear } = Route.useLoaderData()
  const navigate = useNavigate()

  if (!gearSet) {
    return (
      <Page width="form">
        <div className="py-12 text-center">
          <h2 className="font-display text-xl font-bold">Gear set not found</h2>
          <Button asChild className="mt-4">
            <Link to="/gear-sets">Back to gear sets</Link>
          </Button>
        </div>
      </Page>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteGearSet({ data: gearSet.id })
      toast.success('Gear set deleted')
      navigate({ to: '/gear-sets' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete gear set',
      )
    }
  }

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={gearSet.name}
        description={gearSet.description ?? undefined}
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/gear-sets" aria-label="Back to gear sets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <DeleteConfirmation
            title={`Delete ${gearSet.name}?`}
            description="Brews keep their recorded gear; only the reusable set is removed."
            onConfirm={handleDelete}
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        }
      />
      <GearSetEditor gearSet={gearSet} gear={gear} />
    </Page>
  )
}
