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
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/shops/new')({
  component: NewCoffeeShopPage,
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
            <Link to="/shops" aria-label="Back to cafés">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <CoffeeShopForm
        onCreated={async (coffeeShop) => {
          await router.invalidate()
          await navigate({
            to: '/shops/$coffeeShopId',
            params: { coffeeShopId: String(coffeeShop.id) },
          })
        }}
        onCancel={() => navigate({ to: '/shops' })}
      />
    </Page>
  )
}
