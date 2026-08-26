import { CircleHelp } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type PageWidth = 'full' | 'wide' | 'content' | 'form'

const pageWidths: Record<PageWidth, string> = {
  full: '',
  wide: 'mx-auto max-w-5xl',
  content: 'mx-auto max-w-3xl',
  form: 'mx-auto max-w-2xl',
}

interface PageProps extends ComponentProps<'div'> {
  width?: PageWidth
}

/** The shared vertical rhythm and content width for every route. */
export function Page({ width = 'full', className, ...props }: PageProps) {
  return (
    <div
      data-slot="page"
      className={cn(
        'w-full space-y-5 md:space-y-8',
        pageWidths[width],
        className,
      )}
      {...props}
    />
  )
}

interface PageHeaderProps extends Omit<ComponentProps<'header'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  help?: ReactNode
  eyebrow?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  size?: 'default' | 'compact'
}

/** A responsive route heading with one stable alignment for titles and actions. */
export function PageHeader({
  title,
  description,
  help,
  eyebrow,
  leading,
  actions,
  size = 'default',
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4',
        size === 'compact' ? 'sm:items-center' : 'sm:items-end',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-sm font-semibold text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <h1
              className={cn(
                'min-w-0 break-words font-display font-extrabold tracking-tight text-foreground',
                size === 'compact'
                  ? 'text-2xl sm:text-3xl'
                  : 'text-3xl md:text-5xl',
              )}
            >
              {title}
            </h1>
            {help ? <PageHelp>{help}</PageHelp> : null}
          </div>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

function PageHelp({ children }: { readonly children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="About this page"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:size-11"
        openOnHover
        delay={0}
        closeDelay={100}
      >
        <CircleHelp aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent
        className="w-72 text-sm leading-relaxed text-muted-foreground"
        side="bottom"
        sideOffset={6}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
