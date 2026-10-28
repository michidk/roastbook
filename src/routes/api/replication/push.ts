import { createFileRoute } from '@tanstack/react-router'
import { pushRecipes } from '@/lib/server/replication'

export const Route = createFileRoute('/api/replication/push')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input: unknown = await request.json()
          const conflicts = await pushRecipes(input)
          return Response.json(conflicts, {
            headers: { 'Cache-Control': 'no-store' },
          })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error && error.name === 'ZodError'
                  ? 'Invalid replication push request'
                  : 'Replication push failed',
            },
            {
              status:
                error instanceof Error && error.name === 'ZodError' ? 400 : 500,
            },
          )
        }
      },
    },
  },
})
