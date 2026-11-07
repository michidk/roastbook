import '@tanstack/react-start/server-only'

import { McpServer } from '@modelcontextprotocol/server'
import { encodeBase64 } from '@/lib/base64'
import { IntegrationImage } from '../integrations/images.server'
import {
  INTEGRATION_OPERATIONS,
  type IntegrationOperation,
} from '../integrations/operations.server'
import {
  canUseOperation,
  describeIntegrationError,
  requiredScopes,
  runIntegrationOperation,
  toJson,
} from '../integrations/runtime.server'
import { applyToolPolicy, type ToolAudit } from './tool-policy.server'

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

function annotations(operation: IntegrationOperation) {
  if (operation.access === 'read') return readOnly
  const destructive = /^(delete|archive)_/.test(operation.name)
  return {
    readOnlyHint: false,
    destructiveHint: destructive,
    idempotentHint: destructive || operation.name.startsWith('update_'),
    openWorldHint: false,
  } as const
}

/** Dates and decimals must survive JSON, so serialize once and reuse for both fields. */
function ok(data: unknown) {
  const value = { data: toJson(data) }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  }
}

function failed(error: unknown) {
  const { status: _, ...failure } = describeIntegrationError(error)
  return {
    isError: true,
    content: [{ type: 'text' as const, text: failure.message }],
    structuredContent: { error: failure },
  }
}

export type McpRunner = (
  operation: IntegrationOperation,
  input: unknown,
  scopes: readonly string[],
) => Promise<unknown>

/**
 * One MCP tool per integration operation. Tools outside the credential's
 * scopes are not registered; owner-disabled tools are hidden.
 */
export function createRoastbookMcpServer(options: {
  scopes: readonly string[]
  publicUrl?: string
  disabledTools?: ReadonlySet<string>
  audit?: ToolAudit
  /** Tests replace the journal behind the operations. */
  run?: McpRunner
}) {
  const server = new McpServer({
    name: 'roastbook',
    title: 'Roastbook',
    version: '2.0.0',
    description:
      'Your coffee journal. Explore beans, brews, recipes, equipment, and tasting notes, and manage records with your permission.',
    websiteUrl: 'https://roastbook.coffee/',
    ...(options.publicUrl
      ? {
          icons: [
            {
              src: new URL('/logo512.png', options.publicUrl).href,
              mimeType: 'image/png',
              sizes: ['512x512'],
            },
          ],
        }
      : {}),
  })
  applyToolPolicy(server, {
    disabledTools: options.disabledTools ?? new Set(),
    audit: options.audit,
  })
  const run = options.run ?? runIntegrationOperation

  for (const operation of INTEGRATION_OPERATIONS) {
    if (!canUseOperation(operation, options.scopes)) continue
    server.registerTool(
      operation.name,
      {
        title: operation.title,
        description: `${operation.description} Needs ${requiredScopes(operation).join(' and ')}.`,
        inputSchema: operation.input,
        annotations: annotations(operation),
      },
      async (args: unknown) => {
        try {
          const result = await run(operation, args, options.scopes)
          if (result instanceof IntegrationImage)
            return {
              content: [
                {
                  type: 'image' as const,
                  data: encodeBase64(result.bytes),
                  mimeType: result.mimeType,
                },
              ],
            }
          return ok(result)
        } catch (error) {
          return failed(error)
        }
      },
    )
  }

  return server
}
