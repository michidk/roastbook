import { createFileRoute } from '@tanstack/react-router'
import { handleMcpRequest } from '@/lib/mcp/http'

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      POST: ({ request }) => handleMcpRequest(request),
      GET: ({ request }) => handleMcpRequest(request),
      DELETE: ({ request }) => handleMcpRequest(request),
    },
  },
})
