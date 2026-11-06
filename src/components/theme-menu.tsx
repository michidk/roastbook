import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@roastbook/ui/dropdown-menu'
import { Monitor, Moon, Sun, SunMoon } from 'lucide-react'
import {
  isThemePreference,
  THEME_OPTIONS,
  usePreferencesStore,
} from '@/lib/preferences-store'

const modeIcons = { system: Monitor, light: Sun, dark: Moon }

export function ThemeMenu() {
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)
  const setTheme = usePreferencesStore((state) => state.setTheme)

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={!hasHydrated}>
        <SunMoon aria-hidden />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          aria-label="Color theme"
          value={hasHydrated ? theme : 'system'}
          onValueChange={(value) => {
            if (isThemePreference(value)) setTheme(value)
          }}
        >
          {THEME_OPTIONS.map(({ value, label }) => {
            const Icon = modeIcons[value]
            return (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <Icon aria-hidden />
                {label}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
