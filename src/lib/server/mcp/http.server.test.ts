import { describe, expect, test } from 'bun:test'
import { resolveMcpConfig } from './config.server'
import { createMcpHttpHandler, handlesMcpHttpPath } from './http.server'
import type { McpRunner } from './tools.server'

const config = resolveMcpConfig({
  MCP_ALLOWED_HOSTS: 'roastbook.internal',
  MCP_ALLOWED_ORIGINS: 'https://client.internal',
})

const run: McpRunner = async () => ({
  items: [],
  page: 1,
  totalItems: 0,
  scopeLabel: null,
})
const scopes = () => ['brews:read']

function request(host: string, headers: Record<string, string> = {}) {
  return new Request('http://upstream/api/mcp', {
    method: 'POST',
    headers: {
      Host: host,
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2026-07-28',
      'Mcp-Method': 'tools/call',
      'Mcp-Name': 'list_brews',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
        name: 'list_brews',
        arguments: {},
      },
    }),
  })
}

describe('stateless MCP HTTP endpoint', () => {
  test('allows the configured auth origin without trusting incoming Host headers', () => {
    const config = resolveMcpConfig({
      PUBLIC_URL: 'https://coffee.example.test',
    })
    expect(config.allowedHostnames).toContain('coffee.example.test')
    expect(config.allowedOrigins).toContain('coffee.example.test')
    expect(config.allowedHostnames).not.toContain('attacker.example.test')
  })
  test('only handles /api/mcp, with no OAuth or discovery paths', async () => {
    expect(handlesMcpHttpPath('/api/mcp')).toBe(true)
    for (const path of [
      '/.well-known/oauth-protected-resource/api/mcp',
      '/.well-known/oauth-authorization-server',
      '/oauth/register',
      '/oauth/token',
      '/oauth/authorize',
    ]) {
      expect(handlesMcpHttpPath(path)).toBe(false)
    }
    const handle = createMcpHttpHandler(config)
    expect(await handle(new Request('http://localhost/oauth/token'))).toBeNull()
  })

  test('dispatches authenticated requests from allowed hosts', async () => {
    const audits: unknown[] = []
    const handle = createMcpHttpHandler(config, {
      audit: async (event) => void audits.push(event),
      run,
      scopes,
    })
    for (const host of ['localhost:3000', '127.0.0.1', 'roastbook.internal']) {
      const response = await handle(request(host))
      expect(response?.status).toBe(200)
      expect(response?.headers.get('www-authenticate')).toBeNull()
      expect(response?.headers.get('access-control-allow-origin')).toBeNull()
    }
    expect(audits).toHaveLength(3)
    expect(audits[0]).toEqual({
      event: 'tool_called',
      outcome: 'success',
      toolName: 'list_brews',
    })
  })

  test('rejects unknown Host headers (DNS rebinding)', async () => {
    const handle = handlerFor()
    expect((await handle(request('evil.example')))?.status).toBe(403)
    expect(
      (await handle(request('roastbook.internal.evil.example')))?.status,
    ).toBe(403)
  })

  test('rejects disallowed Origin headers but allows configured ones', async () => {
    const handle = handlerFor()
    const bad = await handle(
      request('localhost', { Origin: 'https://evil.example' }),
    )
    expect(bad?.status).toBe(403)
    const good = await handle(
      request('localhost', { Origin: 'https://client.internal' }),
    )
    expect(good?.status).toBe(200)
  })

  test('calling a tool outside the scopes asks for more access', async () => {
    const handle = handlerFor()
    const response = await handle(
      new Request('http://upstream/api/mcp', {
        method: 'POST',
        headers: {
          Host: 'localhost',
          Accept: 'application/json, text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'create_brew', arguments: {} },
        }),
      }),
    )
    expect(response?.status).toBe(403)
    expect(response?.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="brews:write"',
    )
  })

  test('owner policy pauses the endpoint', async () => {
    const handle = createMcpHttpHandler(config, {
      policy: async () => ({ enabled: false, disabledTools: [] }),
      scopes,
    })
    expect((await handle(request('localhost')))?.status).toBe(503)
  })
})

function handlerFor() {
  return createMcpHttpHandler(config, { run, scopes })
}
