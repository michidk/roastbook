import { createFileRoute } from '@tanstack/react-router'
import { handleShottimerTargetRequest } from '@/lib/server/shottimer-api'

export const Route = createFileRoute('/api/shottimer/target')({
  server: {
    handlers: {
      GET: ({ request }) => handleShottimerTargetRequest(request),
    },
  },
})
