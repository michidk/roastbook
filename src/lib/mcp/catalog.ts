/** Tools exposed over MCP. Names are stable: the owner's per-tool switches key on them. */
export const MCP_TOOL_CATALOG = [
  {
    name: 'list_brews',
    title: 'List brews',
    description:
      'Page through logged brews, newest first. Filter by brewing method, rating or bean.',
    group: 'Read',
  },
  {
    name: 'get_brew',
    title: 'Get brew',
    description: 'Read one brew with its bean, equipment, ratings and notes.',
    group: 'Read',
  },
  {
    name: 'list_beans',
    title: 'List beans',
    description:
      'List coffee beans with roaster, roast date and archive state.',
    group: 'Read',
  },
  {
    name: 'get_bean',
    title: 'Get bean',
    description: 'Read one bean with its purchases.',
    group: 'Read',
  },
  {
    name: 'list_recipes',
    title: 'List recipes',
    description: 'List saved brewing recipes.',
    group: 'Read',
  },
  {
    name: 'get_recipe',
    title: 'Get recipe',
    description: 'Read one recipe with its targets and accessory gear.',
    group: 'Read',
  },
  {
    name: 'list_gear',
    title: 'List gear',
    description: 'List machines, grinders and other equipment.',
    group: 'Read',
  },
  {
    name: 'list_roasters',
    title: 'List roasters',
    description: 'List roasters and how many beans each has.',
    group: 'Read',
  },
  {
    name: 'list_brewing_methods',
    title: 'List brewing methods',
    description:
      'List brewing methods and drink types. Use their ids when logging a brew.',
    group: 'Read',
  },
  {
    name: 'get_stats',
    title: 'Get statistics',
    description:
      'Brewing statistics for a period, optionally for one method or bean.',
    group: 'Read',
  },
  {
    name: 'create_brew',
    title: 'Log a brew',
    description:
      'Log a new brew. Needs a brewing method id; look ids up with the list tools first.',
    group: 'Write',
  },
] as const

export type McpToolName = (typeof MCP_TOOL_CATALOG)[number]['name']

export const MCP_TOOL_NAMES = MCP_TOOL_CATALOG.map(
  (tool) => tool.name,
) as readonly McpToolName[]
