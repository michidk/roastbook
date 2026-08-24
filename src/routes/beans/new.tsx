import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { BeanForm } from '@/components/beans/bean-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getRoasters } from '@/lib/server/roasters'

export const Route = createFileRoute('/beans/new')({
  loader: () => getRoasters(),
  component: NewBeanPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})

function NewBeanPage() {
  const roasters = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add beans"
        description="Add a new bag of coffee to your collection"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/beans" aria-label="Back to beans">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <BeanForm
        roasters={roasters}
        onCreated={async (bean) => {
          await router.invalidate()
          await navigate({
            to: '/beans/$beanId',
            params: { beanId: String(bean.id) },
          })
        }}
        onCancel={() => navigate({ to: '/beans' })}
      />
    </Page>
  )
}
