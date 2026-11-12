import { ExternalLink, type LucideIcon } from 'lucide-react'

export function AboutLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  readonly href: string
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-18 items-center gap-4 rounded-xl border border-border bg-card p-3 outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-4"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-link">
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-foreground">
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-link"
        aria-hidden={true}
      />
    </a>
  )
}
