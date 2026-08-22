import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shots/new')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/brews/new', search, replace: true })
  },
})
