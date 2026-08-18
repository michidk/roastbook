import type { ComponentType, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SettingsSection<SectionId extends string = string> = {
  readonly id: SectionId
  readonly label: string
  readonly icon: ComponentType<{
    readonly className?: string
    readonly 'aria-hidden'?: boolean
  }>
}

export function SettingsShell<SectionId extends string>({
  sections,
  activeSection,
  onSectionChange,
  children,
}: {
  readonly sections: readonly SettingsSection<SectionId>[]
  readonly activeSection: SectionId
  readonly onSectionChange: (section: SectionId) => void
  readonly children: ReactNode
}) {
  return (
    <div className="w-[calc(100vw-2rem)] min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-coffee md:w-[calc(100vw-4rem)] lg:grid lg:min-h-[620px] lg:w-full lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-border bg-secondary/45 p-3 lg:border-r lg:border-b-0 lg:p-5">
        <p className="hidden px-3 pb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase lg:block">
          Settings
        </p>
        <div
          aria-label="Settings sections"
          role="tablist"
          className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {sections.map((section, sectionIndex) => {
            const Icon = section.icon
            const isActive = section.id === activeSection

            return (
              <button
                key={section.id}
                id={`settings-tab-${section.id}`}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls="settings-panel"
                onClick={() => onSectionChange(section.id)}
                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                  const offset =
                    event.key === 'ArrowRight' || event.key === 'ArrowDown'
                      ? 1
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                        ? -1
                        : 0
                  const targetIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? sections.length - 1
                        : offset
                          ? (sectionIndex + offset + sections.length) %
                            sections.length
                          : null
                  if (targetIndex === null) return

                  event.preventDefault()
                  const targetSection = sections[targetIndex]
                  if (!targetSection) return
                  onSectionChange(targetSection.id)
                  document
                    .getElementById(`settings-tab-${targetSection.id}`)
                    ?.focus()
                }}
                className={cn(
                  'flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-full',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="size-4.5" aria-hidden={true} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <div
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeSection}`}
        className="min-w-0 bg-background/35 p-4 sm:p-6 lg:p-7"
      >
        <div className="mx-auto max-w-3xl space-y-4">{children}</div>
      </div>
    </div>
  )
}
