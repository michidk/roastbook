import { createServerOnlyFn } from '@tanstack/react-start'

export const handleMcpRequest = createServerOnlyFn(async (request: Request) => {
  const { handleMcpHttpRequest } = await import('@/lib/server/mcp/http.server')
  return (
    (await handleMcpHttpRequest(request)) ??
    new Response('Not found', { status: 404 })
  )
})
