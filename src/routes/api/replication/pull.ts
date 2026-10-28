import { createFileRoute } from '@tanstack/react-router'
import { pullRecipes } from '@/lib/server/replication'

export const Route = createFileRoute('/api/replication/pull')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input: unknown = await request.json()
          const result = await pullRecipes(input)
          return Response.json(result, {
            headers: { 'Cache-Control': 'no-store' },
          })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error && error.name === 'ZodError'
                  ? 'Invalid replication pull request'
                  : 'Replication pull failed',
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
