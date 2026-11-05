import { createFileRoute } from '@tanstack/react-router'
import { handleApiRequest } from '@/lib/api/http'

// The API as the signed-in account, for the API reference's test requests.
export const Route = createFileRoute('/api/try/v1/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleApiRequest(request, '/api/try/v1'),
      POST: ({ request }) => handleApiRequest(request, '/api/try/v1'),
      PATCH: ({ request }) => handleApiRequest(request, '/api/try/v1'),
      DELETE: ({ request }) => handleApiRequest(request, '/api/try/v1'),
    },
  },
})
