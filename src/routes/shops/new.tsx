import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shops/new')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/places/new', search, replace: true })
  },
})
