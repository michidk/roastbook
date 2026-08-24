import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CoffeeShopForm } from '@/components/coffee-shops/coffee-shop-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/places/new')({
  component: NewCoffeeShopPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/places" backLabel="Back to places" />
  ),
})

function NewCoffeeShopPage() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add café"
        description="Add a new café"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/places" aria-label="Back to cafés">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <CoffeeShopForm
        onCreated={async (coffeeShop) => {
          await router.invalidate()
          await navigate({
            to: '/places/$coffeeShopId',
            params: { coffeeShopId: String(coffeeShop.id) },
          })
        }}
        onCancel={() => navigate({ to: '/places' })}
      />
    </Page>
  )
}
