import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/shots/$shotId')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/brews/$shotId',
      params: { shotId: params.shotId },
      search,
      replace: true,
    })
  },
})
