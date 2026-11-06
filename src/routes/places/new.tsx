import { Button } from '@roastbook/ui/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CoffeeShopForm } from '@/components/coffee-shops/coffee-shop-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { FormPending } from '@/components/route-pending'

export const Route = createFileRoute('/places/new')({
  component: NewCoffeeShopPage,
  pendingComponent: FormPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/places" backLabel="Back to places" />
  ),
})

function NewCoffeeShopPage() {
  const navigate = useNavigate()

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
