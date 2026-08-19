import { cn } from '@/lib/utils'

export type DetailSectionLink = {
  readonly id: string
  readonly label: string
}

export function DetailSectionNav({
  links,
  className,
}: {
  readonly links: readonly DetailSectionLink[]
  readonly className?: string
}) {
  return (
    <nav aria-label="On this page" className={cn('sm:hidden', className)}>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="inline-flex h-11 shrink-0 snap-start items-center rounded-full border border-border bg-card/90 px-4 font-display text-sm font-bold text-foreground shadow-control"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
