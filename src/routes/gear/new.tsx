import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { FormPageHeader } from '@/components/form/form-shell'
import { GearForm } from '@/components/gear/gear-form'
import { Page } from '@/components/page-layout'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/gear/new')({
  component: NewGearPage,
})

function NewGearPage() {
  const navigate = useNavigate()
  const router = useRouter()

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
          await router.invalidate()
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
