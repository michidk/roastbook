import { PREFERENCES_STORAGE_KEY } from '@/lib/build-mode'
export const LIGHT_THEMES = [
  {
    id: 'light-roast',
    legacyIds: [],
    name: 'Light Roast',
    description: 'Warm paper, white cards, and caramel accents.',
    background: '#f6eddf',
  },
  {
    id: 'classic-light',
    legacyIds: ['oat-milk'],
    name: 'Classic Light',
    description: 'Soft ivory, white cards, and copper accents.',
    background: '#f7f5f1',
  },
  {
    id: 'pure-light',
    legacyIds: ['garden-cafe'],
    name: 'Pure Light',
    description: 'Pure white, black accents, and clean outlines.',
    background: '#ffffff',
  },
] as const

export const DARK_THEMES = [
  {
    id: 'dark-roast',
    legacyIds: [],
    name: 'Dark Roast',
    description: 'Espresso brown, cream text, and caramel accents.',
    background: '#241b17',
  },
  {
    id: 'classic-dark',
    legacyIds: ['forest-coffee'],
    name: 'Classic Dark',
    description: 'Neutral charcoal, cream text, and copper accents.',
    background: '#191919',
  },
  {
    id: 'pure-dark',
    legacyIds: ['warm-mocha'],
    name: 'Pure Dark',
    description: 'Pure black, white accents, and clean outlines.',
    background: '#000000',
  },
] as const

export type LightTheme = (typeof LIGHT_THEMES)[number]['id']
export type DarkTheme = (typeof DARK_THEMES)[number]['id']

export const THEME_COLORS = {
  light: LIGHT_THEMES[0].background,
  dark: DARK_THEMES[0].background,
} as const

export function resolveLightTheme(value: unknown): LightTheme {
  return (
    LIGHT_THEMES.find(
      (theme) =>
        theme.id === value || theme.legacyIds.some((id) => id === value),
    )?.id ?? 'light-roast'
  )
}

export function resolveDarkTheme(value: unknown): DarkTheme {
  return (
    DARK_THEMES.find(
      (theme) =>
        theme.id === value || theme.legacyIds.some((id) => id === value),
    )?.id ?? 'dark-roast'
  )
}

export function isDarkTheme(theme: unknown, systemDark: boolean): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return systemDark
}

export function themeColor(
  isDark: boolean,
  lightTheme: LightTheme = 'light-roast',
  darkTheme: DarkTheme = 'dark-roast',
): string {
  return isDark
    ? (DARK_THEMES.find((theme) => theme.id === darkTheme)?.background ??
        THEME_COLORS.dark)
    : (LIGHT_THEMES.find((theme) => theme.id === lightTheme)?.background ??
        THEME_COLORS.light)
}

export const THEME_BOOTSTRAP_SCRIPT = `(function () {
  var state = {}
  try {
    var raw = localStorage.getItem('${PREFERENCES_STORAGE_KEY}')
    var stored = raw ? JSON.parse(raw) : null
    if (stored && stored.state && typeof stored.state === 'object') state = stored.state
  } catch (error) {}
  try {
    var lights = ${JSON.stringify(LIGHT_THEMES)}
    var darks = ${JSON.stringify(DARK_THEMES)}
    var light = lights.find(function (theme) { return theme.id === document.documentElement.dataset.lightTheme }) || lights[0]
    var darkPalette = darks.find(function (theme) { return theme.id === document.documentElement.dataset.darkTheme }) || darks[0]
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    var dark = state.theme === 'dark' || (state.theme !== 'light' && systemDark)
    var color = (dark ? darkPalette : light).background
    document.documentElement.dataset.lightTheme = light.id
    document.documentElement.dataset.darkTheme = darkPalette.id
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    document.documentElement.style.backgroundColor = color
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute('content', color)
    })
  } catch (error) {}
})()`
