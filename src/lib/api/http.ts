import { createServerOnlyFn } from '@tanstack/react-start'

export const handleApiRequest = createServerOnlyFn(async (request: Request) => {
  const { handleApiRequest } = await import(
    '@/lib/server/integrations/api.server'
  )
  return handleApiRequest(request)
})
