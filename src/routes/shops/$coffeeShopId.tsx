import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shops/$coffeeShopId')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/places/$coffeeShopId',
      params: { coffeeShopId: params.coffeeShopId },
      search,
      replace: true,
    })
  },
})
