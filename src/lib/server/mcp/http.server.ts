import '@tanstack/react-start/server-only'

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server'
import { getJournalContext } from '@/db/journal-context.server'
import { DEMO_MODE } from '@/lib/build-mode'
import { getIntegrationOperation } from '../integrations/operations.server'
import {
  admitIntegrationRequest,
  canUseOperation,
  missingScopes,
  requireIntegration,
} from '../integrations/runtime.server'
import { getMcpConfig, type McpConfig } from './config.server'
import {
  loadMcpPolicy,
  type McpPolicy,
  recordMcpAudit,
} from './settings.server'
import { createRoastbookMcpServer, type McpRunner } from './tools.server'

const MCP_PATH = '/api/mcp'

export function handlesMcpHttpPath(pathname: string) {
  return pathname === MCP_PATH
}

/**
 * MCP step-up authorization: calling a tool outside the credential's scopes
 * answers 403 insufficient_scope with a challenge, so OAuth clients can ask
 * the owner for more access instead of seeing an unknown tool.
 */
async function insufficientScope(
  request: Request,
  scopes: readonly string[],
): Promise<Response | null> {
  let message: unknown
  try {
    message = await request.clone().json()
  } catch {
    return null
  }
  const call = message as {
    method?: unknown
    params?: { name?: unknown }
  } | null
  if (call?.method !== 'tools/call' || typeof call.params?.name !== 'string')
    return null
  const operation = getIntegrationOperation(call.params.name)
  if (!operation || canUseOperation(operation, scopes)) return null
  const oauth =
    getJournalContext()?.identity.integration?.credentialId.startsWith(
      'oauth:',
    ) ?? false
  // OAuth clients request protocol scopes; tokens show the permission needed.
  const scope = oauth
    ? operation.access === 'write'
      ? 'mcp:read mcp:write'
      : 'mcp:read'
    : [
        ...operation.resources.map(
          (resource) => `${resource}:${operation.access}`,
        ),
        ...missingScopes(operation, scopes),
      ].join(' ')
  return Response.json(
    { error: 'insufficient_scope' },
    {
      status: 403,
      headers: {
        'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${scope}"`,
        'Cache-Control': 'no-store',
      },
    },
  )
}

export function createMcpHttpHandler(
  config: McpConfig,
  options: {
    policy?: () => Promise<McpPolicy>
    audit?: typeof recordMcpAudit
    /** The calling credential's scopes; read per request. */
    scopes?: () => readonly string[]
    run?: McpRunner
  } = {},
) {
  const loadPolicy =
    options.policy ??
    (async () => ({ enabled: true, disabledTools: [] }) as McpPolicy)
  const scopes = options.scopes ?? (() => requireIntegration().scopes)
  // Stateless: a fresh server per request, so the policy and the credential's
  // scopes apply immediately.
  const protocol = createMcpHandler(
    async () =>
      createRoastbookMcpServer({
        scopes: scopes(),
        disabledTools: new Set((await loadPolicy()).disabledTools),
        audit: options.audit,
        run: options.run,
      }),
    { legacy: 'reject' },
  )

  return async (request: Request): Promise<Response | null> => {
    if (!handlesMcpHttpPath(new URL(request.url).pathname)) return null
    // DNS-rebinding defence; no CORS headers are sent.
    const rejected =
      hostHeaderValidationResponse(request, config.allowedHostnames) ??
      originValidationResponse(request, config.allowedOrigins)
    if (rejected) return rejected
    if (!(await loadPolicy()).enabled)
      return Response.json(
        {
          error: 'mcp_disabled',
          error_description: 'MCP is paused by the owner',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    const denied = await insufficientScope(request, scopes())
    if (denied) return denied
    return protocol.fetch(request)
  }
}

let liveHandler: ReturnType<typeof createMcpHttpHandler> | undefined

export async function handleMcpHttpRequest(
  request: Request,
): Promise<Response | null> {
  try {
    if (!handlesMcpHttpPath(new URL(request.url).pathname)) return null
    // The demo edition has no writable database or private network to protect.
    if (DEMO_MODE) return new Response('Not found', { status: 404 })
    liveHandler ??= createMcpHttpHandler(getMcpConfig(), {
      policy: loadMcpPolicy,
      audit: recordMcpAudit,
    })
    const admission = await admitIntegrationRequest()
    if (admission.rejected) return admission.rejected
    try {
      await request.clone().json()
    } catch {
      return Response.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const response = await liveHandler(request)
    if (!response) return null
    const headers = new Headers(response.headers)
    for (const [key, value] of admission.headers) headers.set(key, value)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (error) {
    console.error('[Roastbook] MCP request failed', error)
    return Response.json(
      {
        error: 'server_error',
        error_description: 'MCP service is unavailable',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
