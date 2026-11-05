import '@tanstack/react-start/server-only'
import { requireCloudflareRuntime } from './context.server'

function coordinator(clientId: string) {
  const binding = requireCloudflareRuntime().bindings.OAUTH_COORDINATOR
  return binding.get(binding.idFromName(clientId))
}

export async function coordinateTokenRequest(
  clientId: string,
  request: Request,
) {
  const response = await coordinator(clientId).fetch(request.url, {
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: await request.text(),
  })
  const headers = new Headers()
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') headers.append(name, value)
  })
  for (const cookie of response.headers.getAll('Set-Cookie'))
    headers.append('Set-Cookie', cookie)
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function coordinateRevokeGrant(input: {
  clientId: string
  userId: string
  id: string
}) {
  const response = await coordinator(input.clientId).fetch(
    'https://oauth-coordinator.internal/revoke',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  if (!response.ok)
    throw new Error('Could not disconnect application. Try again.')
}
