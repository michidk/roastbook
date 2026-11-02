import { Monitor, Moon, Sun } from 'lucide-react'
import { THEME_OPTIONS, type ThemePreference } from '@/lib/preferences-store'

const modeIcons = { light: Sun, dark: Moon, system: Monitor }

export function ColorModePicker({
  value,
  disabled,
  onChange,
}: {
  readonly value: ThemePreference
  readonly disabled: boolean
  readonly onChange: (value: ThemePreference) => void
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1 text-sm font-semibold">Color mode</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Only on this device.</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary/50 p-1 sm:w-80">
          {THEME_OPTIONS.map((option) => {
            const Icon = modeIcons[option.value]
            return (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground has-checked:border-input/50 has-checked:bg-card has-checked:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed has-disabled:opacity-50"
              >
                <input
                  type="radio"
                  name="color-mode"
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />
                <Icon className="size-4" aria-hidden />
                {option.label}
              </label>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}
