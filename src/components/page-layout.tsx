import type { ComponentProps, ReactNode } from 'react'
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
        'w-full space-y-6 md:space-y-8',
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
  eyebrow?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  size?: 'default' | 'compact'
}

/** A responsive route heading with one stable alignment for titles and actions. */
export function PageHeader({
  title,
  description,
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
        'flex flex-col gap-4 lg:flex-row lg:justify-between',
        size === 'compact' ? 'lg:items-center' : 'lg:items-end',
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
          <h1
            className={cn(
              'min-w-0 break-words font-display font-extrabold tracking-tight text-foreground',
              size === 'compact'
                ? 'text-2xl sm:text-3xl'
                : 'text-4xl md:text-5xl',
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl min-w-0 break-words text-sm font-semibold leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
