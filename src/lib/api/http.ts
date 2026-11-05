import { createServerOnlyFn } from '@tanstack/react-start'

export const handleApiRequest = createServerOnlyFn(
  async (request: Request, basePath?: '/api/v1' | '/api/try/v1') => {
    const { handleApiRequest } = await import(
      '@/lib/server/integrations/api.server'
    )
    return handleApiRequest(request, basePath)
  },
)
