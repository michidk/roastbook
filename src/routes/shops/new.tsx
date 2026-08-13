import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CoffeeShopForm } from "@/components/coffee-shops/coffee-shop-form"
import { FormPageHeader } from "@/components/form/form-shell"

export const Route = createFileRoute("/shops/new")({
  component: NewCoffeeShopPage,
})

function NewCoffeeShopPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FormPageHeader title="Add Coffee Shop" description="Add a new coffee shop" />
      <CoffeeShopForm
        onCreated={(coffeeShop) =>
          navigate({
            to: "/shops/$coffeeShopId",
            params: { coffeeShopId: String(coffeeShop.id) },
          })
        }
        onCancel={() => navigate({ to: "/shops" })}
      />
    </div>
  )
}
