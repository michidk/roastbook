import { createFileRoute } from '@tanstack/react-router'
import { probeDatabase } from '@/lib/server/health'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await probeDatabase()
          return Response.json(
            { status: 'ready' },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        } catch {
          return Response.json(
            { status: 'unavailable' },
            {
              status: 503,
              headers: { 'Cache-Control': 'no-store' },
            },
          )
        }
      },
    },
  },
})
