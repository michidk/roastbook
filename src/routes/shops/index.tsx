import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shops/')({
  beforeLoad: () => {
    throw redirect({ to: '/places', replace: true })
  },
})
