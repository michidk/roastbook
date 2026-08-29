import {
  Bot,
  Coffee,
  HardDrive,
  Info,
  Map as MapIcon,
  Palette,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import type { SettingsSection } from '@/components/settings/settings-shell'

/**
 * The settings sections, in sidebar order. Each one is its own route so a
 * section can be linked to, bookmarked, and reloaded, and so it only loads the
 * data it actually renders. General is the index route at `/settings`.
 */
export const SETTINGS_SECTIONS = [
  { to: '/settings', label: 'General', icon: SlidersHorizontal },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette },
  { to: '/settings/map', label: 'Map', icon: MapIcon },
  { to: '/settings/drinks', label: 'Drinks', icon: Coffee },
  { to: '/settings/taste-profile', label: 'Taste profile', icon: Sparkles },
  { to: '/settings/ai', label: 'AI', icon: Bot },
  { to: '/settings/storage', label: 'Storage', icon: HardDrive },
  { to: '/settings/about', label: 'About', icon: Info },
] as const satisfies readonly SettingsSection[]
