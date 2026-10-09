import { createFileRoute } from '@tanstack/react-router'
import { handleShottimerShotRequest } from '@/lib/server/shottimer-api'

export const Route = createFileRoute('/api/shottimer/shots')({
  server: {
    handlers: {
      POST: ({ request }) => handleShottimerShotRequest(request),
    },
  },
})
