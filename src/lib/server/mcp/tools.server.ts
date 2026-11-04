import '@tanstack/react-start/server-only'

import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { getBean, getBeans } from '@/journal/beans'
import { getBrewingMethods } from '@/journal/brewing-methods'
import { shotListSchema } from '@/journal/domain/shot-list-contract'
import {
  createShotOperation,
  getShotOperation,
  getShotPageOperation,
} from '@/journal/domain/shots-operations'
import { loadDetailedStats } from '@/journal/domain/stats-detail'
import { getGear } from '@/journal/gear'
import { getRecipe, getRecipes } from '@/journal/recipes'
import { getRoasters } from '@/journal/roasters'
import { MCP_TOOL_CATALOG, type McpToolName } from '@/lib/mcp/catalog'
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
  // The same journal functions the app uses; MCP pages through their results.
  const page = <T>(
    rows: readonly T[],
    { offset, limit }: z.infer<typeof pageInput>,
  ) => rows.slice(offset, offset + limit)
  register('list_beans', pageInput, async (args) =>
    page(await getBeans(), args),
  )
  register('get_bean', idInput, ({ id }) => getBean({ data: id }))
  register('list_recipes', pageInput, async (args) =>
    page(await getRecipes(), args),
  )
  register('get_recipe', idInput, ({ id }) => getRecipe({ data: id }))
  register('list_gear', pageInput, async (args) => page(await getGear(), args))
  register('list_roasters', pageInput, async (args) =>
    page(await getRoasters(), args),
  )
  register('list_brewing_methods', emptyInput, () => getBrewingMethods())
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
