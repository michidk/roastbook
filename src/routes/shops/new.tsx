import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CoffeeShopForm } from '@/components/coffee-shops/coffee-shop-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'

export const Route = createFileRoute('/shops/new')({
  component: NewCoffeeShopPage,
})

function NewCoffeeShopPage() {
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader title="Add café" description="Add a new café" />
      <CoffeeShopForm
        onCreated={(coffeeShop) =>
          navigate({
            to: '/shops/$coffeeShopId',
            params: { coffeeShopId: String(coffeeShop.id) },
          })
        }
        onCancel={() => navigate({ to: '/shops' })}
      />
    </Page>
  )
}
