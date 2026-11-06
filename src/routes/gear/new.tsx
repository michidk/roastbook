import { Button } from '@roastbook/ui/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { FormPageHeader } from '@/components/form/form-shell'
import { GearForm } from '@/components/gear/gear-form'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'

export const Route = createFileRoute('/gear/new')({
  component: NewGearPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/gear" backLabel="Back to gear" />
  ),
})

function NewGearPage() {
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add gear"
        description="Add new equipment to your setup"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/gear" aria-label="Back to gear">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <GearForm
        onCreated={async (item) => {
          await navigate({
            to: '/gear/$gearId',
            params: { gearId: String(item.id) },
          })
        }}
        onCancel={() => navigate({ to: '/gear' })}
      />
    </Page>
  )
}
