import { createFileRoute } from '@tanstack/react-router'
import { handleApiRequest } from '@/lib/api/http'

export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleApiRequest(request),
      POST: ({ request }) => handleApiRequest(request),
      PATCH: ({ request }) => handleApiRequest(request),
      DELETE: ({ request }) => handleApiRequest(request),
    },
  },
})
