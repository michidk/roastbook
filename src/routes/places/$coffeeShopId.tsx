import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CoffeeShopDetailPage } from '@/components/coffee-shops/coffee-shop-detail-page'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getCoffeeShop } from '@/lib/server/coffee-shops'

export const Route = createFileRoute('/places/$coffeeShopId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loader: ({ params }) =>
    getCoffeeShop({ data: parseIdParam(params.coffeeShopId) }),
  component: CoffeeShopDetailRoute,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/places" backLabel="Back to places" />
  ),
})

function CoffeeShopDetailRoute() {
  const coffeeShop = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const navigate = useNavigate({ from: '/places/$coffeeShopId' })

  return (
    <CoffeeShopDetailPage
      coffeeShop={coffeeShop}
      isEditing={isEditing}
      onFinishEditing={() =>
        navigate({
          search: (current) => ({ ...current, edit: undefined }),
          replace: true,
        })
      }
    />
  )
}
