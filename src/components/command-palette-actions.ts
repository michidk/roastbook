import {
  Bean,
  Coffee,
  Cog,
  LayoutDashboard,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'
import type { ComponentType } from 'react'
import {
  createNavItems,
  moreNavItems,
  type NavItem,
  primaryNavItems,
} from '@/components/app-navbar-items'
import type { CommandEntitySearchResults } from '@/lib/command-search-contract'
import type { ThemePreference } from '@/lib/preferences-store'
import { normalizeForComparison } from '@/lib/utils'

type CommandActionBase = {
  readonly value: string
  readonly label: string
  readonly description?: string
  readonly icon: ComponentType<{ className?: string }>
  /** Extra terms the action matches, for words the label does not contain. */
  readonly keywords: readonly string[]
}

export type CommandAction = CommandActionBase &
  (
    | { readonly kind: 'navigate'; readonly to: string }
    | { readonly kind: 'theme'; readonly theme: ThemePreference }
  )

export type CommandActionGroup = {
  readonly label: string
  readonly items: readonly CommandAction[]
}

const dashboardNavItem: NavItem = {
  title: 'Dashboard',
  url: '/',
  icon: LayoutDashboard,
}

/**
 * Terms that should find a destination even though its label does not contain
 * them — synonyms, unaccented spellings, and the internal route vocabulary.
 */
const NAVIGATE_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  '/': ['home', 'start', 'overview', 'today'],
  '/brews': ['shots', 'espresso', 'log', 'journal'],
  '/beans': ['coffee', 'bags', 'rotation'],
  '/visits': ['cafe visits', 'cafes', 'map', 'out'],
  '/places': ['cafes', 'coffee shops', 'saved', 'favorites'],
  '/roasters': ['roasteries', 'brands'],
  '/gear': ['equipment', 'grinder', 'machine', 'kit'],
  '/gear-sets': ['setups', 'equipment', 'kit'],
  '/brewing-methods': ['methods', 'filter', 'espresso', 'fields'],
  '/recipes': ['dial in', 'presets'],
  '/stats': ['statistics', 'analytics', 'charts', 'trends', 'insights'],
  '/settings': ['preferences', 'options', 'configuration', 'appearance'],
  '/brews/new': ['add', 'log', 'shot', 'espresso'],
  '/beans/new': ['add', 'bag', 'coffee'],
  '/visits/new': ['add', 'cafe', 'log'],
}

function toNavigateAction(item: NavItem): CommandAction {
  return {
    kind: 'navigate',
    value: `navigate:${item.url}`,
    label: item.title,
    icon: item.icon,
    keywords: NAVIGATE_KEYWORDS[item.url] ?? [],
    to: item.url,
  }
}

const themeActions: readonly CommandAction[] = [
  {
    kind: 'theme',
    value: 'theme:light',
    label: 'Light theme',
    icon: Sun,
    keywords: ['appearance', 'colour', 'color', 'day', 'paper'],
    theme: 'light',
  },
  {
    kind: 'theme',
    value: 'theme:dark',
    label: 'Dark theme',
    icon: Moon,
    keywords: ['appearance', 'colour', 'color', 'night'],
    theme: 'dark',
  },
  {
    kind: 'theme',
    value: 'theme:system',
    label: 'Browser theme',
    icon: Monitor,
    keywords: ['appearance', 'system', 'automatic', 'default'],
    theme: 'system',
  },
]

/**
 * Builds the palette groups from the navigation items, so a destination added
 * to the navbar is reachable from the palette without a second edit.
 */
export function buildCommandGroups({
  demoMode = false,
}: {
  readonly demoMode?: boolean
} = {}): readonly CommandActionGroup[] {
  const navigate: CommandActionGroup = {
    label: 'Go to',
    items: [dashboardNavItem, ...primaryNavItems, ...moreNavItems].map(
      toNavigateAction,
    ),
  }
  const appearance: CommandActionGroup = {
    label: 'Appearance',
    items: themeActions,
  }

  if (demoMode) return [navigate, appearance]

  return [
    navigate,
    { label: 'Create', items: createNavItems.map(toNavigateAction) },
    appearance,
  ]
}

/** Turns database matches into normal palette navigation actions. */
export function buildEntityCommandGroups(
  results: CommandEntitySearchResults,
): readonly CommandActionGroup[] {
  const definitions = [
    {
      label: 'Brews',
      items: results.brews,
      icon: Coffee,
      path: 'brews',
      keywords: ['brew', 'brews', 'shot', 'shots', 'coffee'],
    },
    {
      label: 'Beans',
      items: results.beans,
      icon: Bean,
      path: 'beans',
      keywords: ['bean', 'beans', 'coffee'],
    },
    {
      label: 'Cafés',
      items: results.cafes,
      icon: Coffee,
      path: 'places',
      keywords: [
        'cafe',
        'cafes',
        'café',
        'cafés',
        'cafee',
        'cafees',
        'coffee shop',
      ],
    },
    {
      label: 'Gear',
      items: results.gear,
      icon: Cog,
      path: 'gear',
      keywords: ['gear', 'equipment'],
    },
  ] as const

  return definitions.flatMap((definition) => {
    if (definition.items.length === 0) return []
    return [
      {
        label: definition.label,
        items: definition.items.map(
          (item): CommandAction => ({
            kind: 'navigate',
            value: `entity:${definition.path}:${item.id}`,
            label: item.label,
            description: item.description ?? undefined,
            icon: definition.icon,
            keywords: [...definition.keywords, ...item.keywords],
            to: `/${definition.path}/${item.id}`,
          }),
        ),
      },
    ]
  })
}

/**
 * Matches an action when every whitespace-separated term of the query appears
 * in its label or keywords, so "new bean" and "bean new" both find New bean.
 */
export function matchesCommandQuery(
  action: CommandAction,
  query: string,
): boolean {
  const terms = normalizeForComparison(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true

  const haystack = normalizeForComparison(
    [action.label, ...action.keywords].join(' '),
  )
  return terms.every((term) => haystack.includes(term))
}
