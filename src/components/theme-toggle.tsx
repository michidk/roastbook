import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePreferencesStore } from '@/lib/preferences-store'

/** A quiet header control that switches between the effective light and dark themes. */
export function ThemeToggle() {
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)
  const setTheme = usePreferencesStore((state) => state.setTheme)

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle color theme"
          disabled={!hasHydrated}
          className="relative text-muted-foreground/70 hover:bg-transparent hover:text-foreground"
          onClick={() => {
            const isDark = document.documentElement.classList.contains('dark')
            setTheme(isDark ? 'light' : 'dark')
          }}
        >
          <Sun
            aria-hidden="true"
            className="rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0 motion-reduce:transition-none"
          />
          <Moon
            aria-hidden="true"
            className="absolute rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100 motion-reduce:transition-none"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Toggle color theme</TooltipContent>
    </Tooltip>
  )
}
