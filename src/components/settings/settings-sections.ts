import {
  Bot,
  Braces,
  CloudOff,
  Coffee,
  HardDrive,
  Info,
  Map as MapIcon,
  Palette,
  Plug,
  SlidersHorizontal,
  Sparkles,
  Timer,
  UserRound,
} from 'lucide-react'
import type { SectionNavigationItem } from '@/components/section-layout'

/**
 * The settings sections, in sidebar order. Each one is its own route so a
 * section can be linked to, bookmarked, and reloaded, and so it only loads the
 * data it actually renders. General is the index route at `/settings`.
 */
export const SETTINGS_SECTIONS = [
  { to: '/settings/account', label: 'Account', icon: UserRound },
  { to: '/settings', label: 'General', icon: SlidersHorizontal },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette },
  { to: '/settings/map', label: 'Map', icon: MapIcon },
  { to: '/settings/drinks', label: 'Drinks', icon: Coffee },
  { to: '/settings/taste-profile', label: 'Taste profile', icon: Sparkles },
  { to: '/settings/ai', label: 'AI Integration', icon: Bot },
  { to: '/settings/api', label: 'API', icon: Braces },
  { to: '/settings/mcp', label: 'AI access (MCP)', icon: Plug },
  { to: '/settings/shottimer', label: 'Shottimer', icon: Timer },
  { to: '/settings/storage', label: 'Storage', icon: HardDrive },
  { to: '/settings/offline', label: 'Offline', icon: CloudOff },
  { to: '/settings/about', label: 'About', icon: Info },
] as const satisfies readonly SectionNavigationItem[]
