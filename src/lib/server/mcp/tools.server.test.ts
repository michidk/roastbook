import { expect, test } from 'bun:test'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { MCP_TOOL_NAMES } from '@/lib/mcp/catalog'
import { createRoastbookMcpServer, type McpLoaders } from './tools.server'

async function connect(
  loaders: McpLoaders,
  options: Parameters<typeof createRoastbookMcpServer>[1] = {},
) {
  const handler = createMcpHandler(
    () => createRoastbookMcpServer(loaders, options),
    { keepAliveMs: 0 },
  )
  const client = new Client(
    { name: 'test', version: '1' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } },
  )
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  )
  return { client, close: () => client.close() }
}

test('lists every catalog tool and hides owner-disabled ones', async () => {
  const all = await connect({})
  const disabled = await connect(
    {},
    { disabledTools: new Set(['create_brew']) },
  )
  try {
    expect(
      (await all.client.listTools()).tools.map((t) => t.name).sort(),
    ).toEqual([...MCP_TOOL_NAMES].sort())
    const names = (await disabled.client.listTools()).tools.map((t) => t.name)
    expect(names).not.toContain('create_brew')
    expect(names).toContain('list_brews')
  } finally {
    await all.close()
    await disabled.close()
  }
})

test('create_brew validates input, logs the brew and audits the outcome', async () => {
  const audits: { toolName: string; outcome: string }[] = []
  const created: unknown[] = []
  const connected = await connect(
    {
      createBrew: (async (data: unknown) => {
        created.push(data)
        return { id: 7 }
      }) as McpLoaders['createBrew'],
    },
    {
      audit: async ({ toolName, outcome }) =>
        void audits.push({ toolName, outcome }),
    },
  )
  try {
    const ok = await connected.client.callTool({
      name: 'create_brew',
      arguments: { brewingMethodId: 1, doseGrams: '18', yieldGrams: '36' },
    })
    expect(ok.isError).not.toBe(true)
    expect(created).toHaveLength(1)
    const bad = await connected.client
      .callTool({
        name: 'create_brew',
        arguments: { brewingMethodId: 0 },
      })
      .then(
        (r) => r.isError === true,
        () => true,
      )
    expect(bad).toBe(true)
    expect(audits[0]).toEqual({ toolName: 'create_brew', outcome: 'success' })
  } finally {
    await connected.close()
  }
})
