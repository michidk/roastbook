import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shots/')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/brews', search, replace: true })
  },
})
