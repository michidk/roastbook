import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shops/')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/places', search, replace: true })
  },
})
