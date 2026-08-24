import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { BrewingMethodForm } from '@/components/brewing-methods/brewing-method-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/brewing-methods/new')({
  component: NewBrewingMethodPage,
})

function NewBrewingMethodPage() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add brewing method"
        description="Name the method first, then choose the fields it records."
        leading={
          <Button variant="ghost" size="icon" asChild>
            <Link to="/brewing-methods" aria-label="Back to brewing methods">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <BrewingMethodForm
        onCreated={async (method) => {
          await router.invalidate()
          await navigate({
            to: '/brewing-methods/$brewingMethodId',
            params: { brewingMethodId: String(method.id) },
          })
        }}
        onCancel={() => navigate({ to: '/brewing-methods' })}
      />
    </Page>
  )
}
