import { expect, test } from 'bun:test'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { allScopes } from '@/modules/integrations/scopes'
import { INTEGRATION_OPERATION_NAMES } from '../integrations/operations.server'
import { runIntegrationOperation } from '../integrations/runtime.server'
import { createRoastbookMcpServer, type McpRunner } from './tools.server'

type Options = Parameters<typeof createRoastbookMcpServer>[0]

async function connect(options: Options) {
  const handler = createMcpHandler(() => createRoastbookMcpServer(options), {
    keepAliveMs: 0,
  })
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

const names = async (options: Options) => {
  const connected = await connect(options)
  try {
    return (await connected.client.listTools()).tools.map((tool) => tool.name)
  } finally {
    await connected.close()
  }
}

test('lists every operation for full access and hides owner-disabled ones', async () => {
  expect((await names({ scopes: allScopes('write') })).sort()).toEqual(
    [...INTEGRATION_OPERATION_NAMES].sort(),
  )
  const disabled = await names({
    scopes: allScopes('write'),
    disabledTools: new Set(['create_brew']),
  })
  expect(disabled).not.toContain('create_brew')
  expect(disabled).toContain('list_brews')
})

test('offers only the tools the credential’s scopes allow', async () => {
  const readBeans = await names({ scopes: ['beans:read'] })
  expect(readBeans).toContain('list_beans')
  expect(readBeans).toContain('get_bean')
  // Pictures of bags are readable with beans:read.
  expect(readBeans).toContain('get_image')
  expect(readBeans).not.toContain('create_bean')
  expect(readBeans).not.toContain('list_brews')
  expect(readBeans).not.toContain('upload_image')
  expect(await names({ scopes: [] })).toEqual([])
})

test('create_brew validates input, runs the operation and audits the outcome', async () => {
  const audits: { toolName: string; outcome: string }[] = []
  const created: unknown[] = []
  const run: McpRunner = async (operation, input) => {
    created.push({ name: operation.name, input })
    return { id: 7, brewedAt: new Date('2026-01-02T03:04:05Z') }
  }
  const connected = await connect({
    scopes: ['brews:write'],
    run,
    audit: async ({ toolName, outcome }) =>
      void audits.push({ toolName, outcome }),
  })
  try {
    const ok = await connected.client.callTool({
      name: 'create_brew',
      arguments: {
        brewingMethodId: 1,
        doseGrams: '18',
        yieldGrams: '36',
        brewedAt: '2026-01-02T03:04:05.000Z',
      },
    })
    expect(ok.isError).not.toBe(true)
    expect(ok.structuredContent).toEqual({
      data: { id: 7, brewedAt: '2026-01-02T03:04:05.000Z' },
    })
    expect(created).toHaveLength(1)
    // JSON dates reach the journal as Date objects.
    expect(
      (created[0] as { input: { brewedAt: unknown } }).input.brewedAt,
    ).toBeInstanceOf(Date)
    const bad = await connected.client
      .callTool({ name: 'create_brew', arguments: { brewingMethodId: 0 } })
      .then(
        (result) => result.isError === true,
        () => true,
      )
    expect(bad).toBe(true)
    expect(created).toHaveLength(1)
    expect(audits[0]).toEqual({ toolName: 'create_brew', outcome: 'success' })
  } finally {
    await connected.close()
  }
})

test('picture tools check the scope of the entity they touch', async () => {
  const connected = await connect({
    scopes: ['beans:write'],
    // The real runner, with the journal never reached for denied calls.
    run: (operation, input, scopes) =>
      runIntegrationOperation(operation, input, scopes),
  })
  try {
    const denied = await connected.client.callTool({
      name: 'delete_image',
      arguments: { entityType: 'brews', entityId: 1, imageId: 2 },
    })
    expect(denied.isError).toBe(true)
    expect(denied.structuredContent).toMatchObject({
      error: { code: 'insufficient_scope', scope: 'brews:write' },
    })
  } finally {
    await connected.close()
  }
})
