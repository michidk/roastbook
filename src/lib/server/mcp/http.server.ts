import '@tanstack/react-start/server-only'

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server'
import { z } from 'zod'
import { requireIdentity } from '@/db/journal-context.server'
import { DEMO_MODE } from '@/lib/build-mode'
import { MCP_TOOL_CATALOG } from '@/lib/mcp/catalog'
import { getMcpConfig, type McpConfig } from './config.server'
import { allowMcpRequest } from './rate-limit.server'
import {
  loadMcpPolicy,
  type McpPolicy,
  recordMcpAudit,
} from './settings.server'
import { createRoastbookMcpServer, type McpLoaders } from './tools.server'

const MCP_PATH = '/api/mcp'

export function handlesMcpHttpPath(pathname: string) {
  return pathname === MCP_PATH
}

export function createMcpHttpHandler(
  config: McpConfig,
  options: {
    policy?: () => Promise<McpPolicy>
    audit?: typeof recordMcpAudit
    loaders?: McpLoaders
  } = {},
) {
  const loadPolicy =
    options.policy ??
    (async () => ({ enabled: true, disabledTools: [] }) as McpPolicy)
  // Stateless: a fresh server per request, so the policy applies immediately.
  const protocol = createMcpHandler(
    async () =>
      createRoastbookMcpServer(options.loaders, {
        disabledTools: new Set((await loadPolicy()).disabledTools),
        audit: options.audit,
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
      policy: async () => {
        const policy = await loadMcpPolicy()
        const scopes = requireIdentity().mcpScopes ?? []
        return {
          ...policy,
          disabledTools: [
            ...new Set([
              ...policy.disabledTools,
              ...MCP_TOOL_CATALOG.filter(
                (tool) =>
                  !scopes.includes(
                    tool.group === 'Write' ? 'mcp:write' : 'mcp:read',
                  ),
              ).map((tool) => tool.name),
            ]),
          ],
        }
      },
      audit: recordMcpAudit,
    })
    if (!(await allowMcpRequest()))
      return Response.json(
        { error: 'rate_limit_exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
        },
      )
    const scopes = requireIdentity().mcpScopes ?? []
    let message: unknown
    try {
      message = await request.clone().json()
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
    const call = z
      .object({
        method: z.literal('tools/call'),
        params: z.object({ name: z.string() }),
      })
      .safeParse(message)
    if (
      call.success &&
      call.data.params.name === 'create_brew' &&
      !scopes.includes('mcp:write')
    )
      return Response.json(
        { error: 'insufficient_scope' },
        {
          status: 403,
          headers: {
            'WWW-Authenticate':
              'Bearer error="insufficient_scope", scope="mcp:read mcp:write"',
            'Cache-Control': 'no-store',
          },
        },
      )
    return await liveHandler(request)
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
