import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { beans, brewingMethods, shots } from '@/db/schema'
import { createRoastbookMcpServer } from './tools.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip

integrationDescribe('MCP tools against PostgreSQL', () => {
  let beanId: number
  let methodId: number
  let brewId: number | undefined
  const handler = createMcpHandler(() => createRoastbookMcpServer(), {
    keepAliveMs: 0,
  })
  const client = new Client(
    { name: 'integration', version: '1' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } },
  )

  beforeAll(async () => {
    const [bean] = await db
      .insert(beans)
      .values({ name: `mcp-${crypto.randomUUID()}` })
      .returning()
    const [method] = await db
      .insert(brewingMethods)
      .values({ name: `mcp-${crypto.randomUUID()}` })
      .returning()
    if (!bean || !method) throw new Error('Missing fixtures')
    beanId = bean.id
    methodId = method.id
    await client.connect(
      new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
        fetch: (input, init) => handler.fetch(new Request(input, init)),
      }),
    )
  })

  afterAll(async () => {
    await client.close()
    if (brewId) await db.delete(shots).where(eq(shots.id, brewId))
    await db.delete(beans).where(eq(beans.id, beanId))
    await db.delete(brewingMethods).where(eq(brewingMethods.id, methodId))
  })

  test('logs a brew and reads it back through the read tools', async () => {
    const created = await client.callTool({
      name: 'create_brew',
      arguments: {
        brewingMethodId: methodId,
        beanId,
        doseGrams: '18',
        yieldGrams: '36',
        notes: 'mcp integration',
      },
    })
    expect(created.isError).not.toBe(true)
    brewId = (created.structuredContent as { data: { id: number } }).data.id
    const brew = await client.callTool({
      name: 'get_brew',
      arguments: { id: brewId },
    })
    expect(JSON.stringify(brew.structuredContent)).toContain('mcp integration')
    const beansList = await client.callTool({
      name: 'list_beans',
      arguments: { limit: 50 },
    })
    expect(beansList.isError).not.toBe(true)
    const methods = await client.callTool({
      name: 'list_brewing_methods',
      arguments: {},
    })
    expect(JSON.stringify(methods.structuredContent)).toContain(
      String(methodId),
    )
    for (const name of ['list_recipes', 'list_gear', 'list_roasters']) {
      expect((await client.callTool({ name, arguments: {} })).isError).not.toBe(
        true,
      )
    }
    const listed = await client.callTool({
      name: 'list_brews',
      arguments: {},
    })
    expect(listed.isError).not.toBe(true)
    const stats = await client.callTool({
      name: 'get_stats',
      arguments: { period: 'all' },
    })
    expect(stats.isError).not.toBe(true)
  })
})
