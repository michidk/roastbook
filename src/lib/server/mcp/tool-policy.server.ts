import type { McpServer } from '@modelcontextprotocol/server'

export type ToolAudit = (event: {
  event: 'tool_called'
  toolName: string
  outcome: 'success' | 'failure'
}) => Promise<void>

/** Call before registering tools: hides owner-disabled tools and audits every call. */
export function applyToolPolicy(
  server: McpServer,
  options: { disabledTools: ReadonlySet<string>; audit?: ToolAudit },
) {
  const register = server.registerTool.bind(server) as (...args: unknown[]) => {
    disable(): void
  }
  server.registerTool = ((
    name: string,
    config: unknown,
    handler: (...args: unknown[]) => Promise<{ isError?: boolean } | undefined>,
  ) => {
    const tool = register(name, config, async (...args: unknown[]) => {
      let outcome: 'success' | 'failure' = 'failure'
      try {
        const result = await handler(...args)
        outcome = result?.isError ? 'failure' : 'success'
        return result
      } finally {
        await options
          .audit?.({ event: 'tool_called', toolName: name, outcome })
          .catch(() => console.error('[MCP] audit persistence failed'))
      }
    })
    if (options.disabledTools.has(name)) tool.disable()
    return tool
  }) as unknown as typeof server.registerTool
}
