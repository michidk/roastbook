import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(
    'horizontal',
  )

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const updateOrientation = () =>
      setOrientation(desktop.matches ? 'vertical' : 'horizontal')

    updateOrientation()
    desktop.addEventListener('change', updateOrientation)
    return () => desktop.removeEventListener('change', updateOrientation)
  }, [])

  return (
    <Tabs
      value={activeSection}
      orientation={orientation}
      onValueChange={(value) => {
        if (sections.some((section) => section.id === value)) {
          onSectionChange(value as SectionId)
        }
      }}
      className="w-[calc(100vw-2rem)] min-w-0 max-w-full flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-coffee md:w-[calc(100vw-4rem)] lg:grid lg:min-h-[620px] lg:w-full lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <aside className="border-b border-border bg-secondary/45 p-3 lg:border-r lg:border-b-0 lg:p-5">
        <p className="hidden px-3 pb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase lg:block">
          Settings
        </p>
        <TabsList
          aria-label="Settings sections"
          className="h-auto w-full flex-row justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {sections.map((section) => {
            const Icon = section.icon

            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  'min-h-11 shrink-0 flex-none justify-start gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground shadow-none after:hidden hover:bg-secondary hover:text-foreground data-active:bg-accent data-active:text-accent-foreground data-active:!shadow-none lg:w-full',
                )}
              >
                <Icon className="size-4.5" aria-hidden={true} />
                <span>{section.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </aside>

      <TabsContent
        value={activeSection}
        className="min-w-0 bg-background/35 p-4 sm:p-6 lg:p-7"
      >
        <div className="mx-auto max-w-3xl divide-y divide-border">
          {children}
        </div>
      </TabsContent>
    </Tabs>
  )
}

export function SettingsPanelSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly contentClassName?: string
}) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className={cn('py-5 first:pt-0 last:pb-0 sm:py-6', className)}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2
            id={headingId}
            className="font-display text-lg leading-snug font-bold tracking-tight"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn('mt-5 space-y-4', contentClassName)}>{children}</div>
    </section>
  )
}
