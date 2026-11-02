import { Check, Moon, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ThemePalettePickerProps<T extends string> {
  readonly mode: 'light' | 'dark'
  readonly value: T
  readonly options: readonly {
    readonly id: T
    readonly name: string
    readonly description: string
  }[]
  readonly disabled: boolean
  readonly onChange: (value: T) => void
}

export function ThemePalettePicker<T extends string>({
  mode,
  value,
  options,
  disabled,
  onChange,
}: ThemePalettePickerProps<T>) {
  const Icon = mode === 'light' ? Sun : Moon
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="mb-1 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {mode === 'light' ? 'Light theme' : 'Dark theme'}
        </span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option, index) => (
          <label
            key={option.id}
            className={cn(
              'relative grid cursor-pointer grid-cols-[112px_1fr] gap-3 rounded-xl border border-border p-2.5 transition-colors hover:border-input hover:bg-secondary/30 sm:block sm:space-y-2.5',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-ring',
              'has-checked:border-primary has-checked:bg-accent/20 has-checked:ring-1 has-checked:ring-primary/20 has-disabled:cursor-not-allowed has-disabled:opacity-60',
            )}
          >
            <input
              type="radio"
              name={`${mode}-palette`}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />
            <span className="relative block">
              <ThemeMock mode={mode} palette={option.id} />
              {value === option.id ? (
                <span className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check aria-hidden className="size-3" />
                </span>
              ) : null}
            </span>
            <span className="block min-w-0 space-y-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
                {option.name}
                {index === 0 ? (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px] leading-4"
                  >
                    Default
                  </Badge>
                ) : null}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ThemeMock({
  mode,
  palette,
}: {
  readonly mode: 'light' | 'dark'
  readonly palette: string
}) {
  return (
    <span
      aria-hidden="true"
      data-theme-mode={mode}
      data-theme-preview={palette}
      className="block h-24 overflow-hidden rounded-lg border border-border bg-background p-2 text-foreground"
    >
      <span className="mb-2 flex items-center gap-1 border-b border-border pb-2">
        <span className="size-2 rounded-full bg-primary" />
        <span className="h-1 w-9 rounded bg-foreground/70" />
        <span className="ml-auto h-1 w-3 rounded bg-muted-foreground/50" />
      </span>
      <span className="flex gap-1.5">
        <span className="flex-1 space-y-1.5 rounded border border-border bg-card p-2">
          <span className="block h-1 w-3/4 rounded bg-foreground/80" />
          <span className="block h-1 w-1/2 rounded bg-muted-foreground/60" />
          <span className="block h-3 w-3/4 rounded bg-primary" />
        </span>
        <span className="flex w-1/3 flex-col gap-1.5">
          <span className="h-6 rounded border border-border bg-secondary" />
          <span className="h-6 rounded border border-border bg-card" />
        </span>
      </span>
    </span>
  )
}
