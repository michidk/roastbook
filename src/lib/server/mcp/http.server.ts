import '@tanstack/react-start/server-only'

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server'
import { DEMO_MODE } from '@/lib/build-mode'
import { getMcpConfig, type McpConfig } from './config.server'
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
  const protocol = createMcpHandler(async () =>
    createRoastbookMcpServer(options.loaders, {
      disabledTools: new Set((await loadPolicy()).disabledTools),
      audit: options.audit,
    }),
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
      policy: loadMcpPolicy,
      audit: recordMcpAudit,
    })
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
