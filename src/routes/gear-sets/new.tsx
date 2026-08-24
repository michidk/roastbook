import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { FormPageHeader } from '@/components/form/form-shell'
import { GearSetForm } from '@/components/gear-sets/gear-set-form'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getGear } from '@/lib/server/gear'

export const Route = createFileRoute('/gear-sets/new')({
  loader: () => getGear(),
  component: NewGearSetPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError
      error={error}
      backTo="/gear-sets"
      backLabel="Back to gear sets"
    />
  ),
})

function NewGearSetPage() {
  const gear = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add gear set"
        description="Group equipment you use together so a brew can load it all at once."
        leading={
          <Button variant="ghost" size="icon" asChild>
            <Link to="/gear-sets" aria-label="Back to gear sets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <GearSetForm
        gear={gear}
        onCreated={(gearSet) =>
          navigate({
            to: '/gear-sets/$gearSetId',
            params: { gearSetId: String(gearSet.id) },
          })
        }
        onCancel={() => navigate({ to: '/gear-sets' })}
      />
    </Page>
  )
}
