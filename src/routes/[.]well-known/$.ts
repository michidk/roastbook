import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/.well-known/$')({
  server: {
    handlers: {
      GET: () => new Response('Not found', { status: 404 }),
      HEAD: () => new Response(null, { status: 404 }),
    },
  },
})
