import '@tanstack/react-start/server-only'

import { McpServer } from '@modelcontextprotocol/server'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { beans, brewingMethods, gear, recipes, roasters } from '@/db/schema'
import { MCP_TOOL_CATALOG, type McpToolName } from '@/lib/mcp/catalog'
import { shotListSchema } from '@/lib/server/shot-list-contract.server'
import {
  createShotOperation,
  getShotOperation,
  getShotPageOperation,
} from '@/lib/server/shots-operations.server'
import { loadDetailedStats } from '@/lib/server/stats-detail.server'
import { positiveIdSchema, shotCreateSchema } from '@/lib/server-validation'
import { parseStatsFilter } from '@/lib/stats-filters'
import { assertValidUpdate, getShotUpdateErrors } from '@/lib/update-validation'
import { applyToolPolicy, type ToolAudit } from './tool-policy.server'

const MAX_LIMIT = 50
const pageInput = z.object({
  offset: z.number().int().min(0).max(100_000).default(0),
  limit: z.number().int().min(1).max(MAX_LIMIT).default(20),
})
const idInput = z.object({ id: positiveIdSchema })
const emptyInput = z.object({})
const brewInput = shotCreateSchema
  .pick({
    brewingMethodId: true,
    beanId: true,
    beanPurchaseId: true,
    drinkTypeId: true,
    machineId: true,
    grinderId: true,
    grindSetting: true,
    doseGrams: true,
    brewWaterGrams: true,
    yieldGrams: true,
    shotTimeSeconds: true,
    rating: true,
    notes: true,
  })
  // MCP input is JSON, which has no Date; the ISO string is converted below.
  .extend({ brewedAt: z.iso.datetime().optional() })
const statsInput = z.object({
  period: z.enum(['30d', '90d', 'ytd', '1y', 'all', 'custom']).optional(),
  method: positiveIdSchema.optional(),
  bean: positiveIdSchema.optional(),
  from: z.string().optional().describe('YYYY-MM-DD, with period=custom'),
  to: z.string().optional().describe('YYYY-MM-DD, with period=custom'),
})

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const
const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const

/** Dates and decimals must survive JSON, so serialize once and reuse for both fields. */
function ok(data: unknown) {
  const value = JSON.parse(JSON.stringify({ data: data ?? null }))
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  }
}

function failed(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
    structuredContent: { data: { error: message } },
  }
}

export type McpLoaders = {
  listBrews?: typeof getShotPageOperation
  createBrew?: typeof createShotOperation
}

export function createRoastbookMcpServer(
  loaders: McpLoaders = {},
  options: { disabledTools?: ReadonlySet<string>; audit?: ToolAudit } = {},
) {
  const server = new McpServer({ name: 'roastbook', version: '1.0.0' })
  applyToolPolicy(server, {
    disabledTools: options.disabledTools ?? new Set(),
    audit: options.audit,
  })
  const catalog = new Map(MCP_TOOL_CATALOG.map((tool) => [tool.name, tool]))

  function register<S extends z.ZodObject>(
    name: McpToolName,
    input: S,
    run: (args: z.output<S>) => Promise<unknown>,
  ) {
    const tool = catalog.get(name)
    if (!tool) throw new Error(`Unknown MCP tool ${name}`)
    // Generic zod schemas defeat the SDK's overload inference; arguments are parsed by the SDK.
    const registerTool = server.registerTool.bind(server) as unknown as (
      name: string,
      config: unknown,
      callback: unknown,
    ) => unknown
    registerTool(
      name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: input,
        annotations: tool.group === 'Read' ? readOnly : write,
      },
      async (args: z.output<S>) => {
        try {
          return ok(await run(args))
        } catch (error) {
          return failed(
            error instanceof z.ZodError || error instanceof Error
              ? error.message
              : 'The operation failed',
          )
        }
      },
    )
  }

  register('list_brews', shotListSchema, (args) =>
    (loaders.listBrews ?? getShotPageOperation)(args),
  )
  register('get_brew', idInput, ({ id }) => getShotOperation(id))
  register('list_beans', pageInput, ({ offset, limit }) =>
    db.query.beans.findMany({
      orderBy: [desc(beans.createdAt)],
      limit,
      offset,
      with: { roasterRef: { columns: { id: true, name: true } } },
    }),
  )
  register('get_bean', idInput, ({ id }) =>
    db.query.beans.findFirst({
      where: eq(beans.id, id),
      with: {
        roasterRef: { columns: { id: true, name: true } },
        purchases: true,
      },
    }),
  )
  register('list_recipes', pageInput, ({ offset, limit }) =>
    db.query.recipes.findMany({
      orderBy: [desc(recipes.updatedAt)],
      limit,
      offset,
    }),
  )
  register('get_recipe', idInput, ({ id }) =>
    db.query.recipes.findFirst({ where: eq(recipes.id, id) }),
  )
  register('list_gear', pageInput, ({ offset, limit }) =>
    db.query.gear.findMany({
      orderBy: [desc(gear.createdAt)],
      limit,
      offset,
    }),
  )
  register('list_roasters', pageInput, ({ offset, limit }) =>
    db.query.roasters.findMany({
      orderBy: [asc(roasters.name)],
      limit,
      offset,
    }),
  )
  register('list_brewing_methods', emptyInput, () =>
    db.query.brewingMethods.findMany({
      columns: { id: true, name: true, description: true },
      orderBy: [asc(brewingMethods.id)],
      with: { drinkTypeLinks: true },
    }),
  )
  register('get_stats', statsInput, (args) =>
    loadDetailedStats(parseStatsFilter(args)),
  )
  register('create_brew', brewInput, (args) => {
    const data = shotCreateSchema.parse({
      ...args,
      brewedAt: args.brewedAt ? new Date(args.brewedAt) : undefined,
    })
    assertValidUpdate(getShotUpdateErrors({ id: 0, ...data }))
    return (loaders.createBrew ?? createShotOperation)(data)
  })

  return server
}
