import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  actionHref: string
  actionSearch?: Record<string, unknown>
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionSearch,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-9 sm:py-12">
        <Icon className="mb-3 size-10 text-muted-foreground sm:mb-4 sm:size-12" />
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button asChild>
          <Link to={actionHref} search={actionSearch}>
            {actionLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
