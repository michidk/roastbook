import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FormPageHeader } from '@/components/form/form-shell'
import { GearForm } from '@/components/gear/gear-form'
import { Page } from '@/components/page-layout'

export const Route = createFileRoute('/gear/new')({
  component: NewGearPage,
})

function NewGearPage() {
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add gear"
        description="Add new equipment to your setup"
      />
      <GearForm
        onCreated={(item) =>
          navigate({ to: '/gear/$gearId', params: { gearId: String(item.id) } })
        }
        onCancel={() => navigate({ to: '/gear' })}
      />
    </Page>
  )
}
