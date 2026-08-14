import { Link } from '@tanstack/react-router'
import type { ComponentType, ReactNode } from 'react'
import {
  Card,
  CardContent,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  readonly label: string
  readonly value: ReactNode
  readonly detail?: string
  readonly icon?: ComponentType<{ readonly className?: string }>
  readonly href?: string
  readonly variant?: 'default' | 'hero' | 'quiet'
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  variant = 'default',
}: MetricCardProps) {
  const card = (
    <Card
      className={cn(
        'h-full',
        variant === 'hero' &&
          'bg-coffee text-coffee-foreground shadow-coffee-strong',
        variant === 'quiet' &&
          'rounded-2xl bg-secondary/70 py-4 shadow-none [--card-spacing:--spacing(4)]',
      )}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-medium',
              variant === 'hero'
                ? 'text-coffee-foreground/80'
                : 'text-muted-foreground',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'font-display font-bold leading-none tabular-nums',
              variant === 'hero' ? 'mt-2 text-5xl' : 'mt-1 text-3xl',
            )}
          >
            {value}
          </p>
          {detail ? (
            <p
              className={cn(
                'mt-1 text-xs',
                variant === 'hero'
                  ? 'text-coffee-foreground/80'
                  : 'text-muted-foreground',
              )}
            >
              {detail}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              variant === 'hero'
                ? 'bg-coffee-foreground/10 text-coffee-foreground'
                : 'bg-primary/10 text-link',
            )}
          >
            <Icon className="size-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link to={href} className={interactiveCardLinkClassName}>
      {card}
    </Link>
  ) : (
    card
  )
}
