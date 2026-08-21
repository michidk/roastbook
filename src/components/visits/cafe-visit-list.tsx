import { Link } from '@tanstack/react-router'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'

export type CafeVisitListItem = {
  readonly id: number
  readonly drinkName: string | null
  readonly rating: number | null
  readonly visitedAt: Date | string
}

export function sortCafeVisitsByDate<Visit extends CafeVisitListItem>(
  visits: readonly Visit[],
): Visit[] {
  return [...visits].sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  )
}

/** Compact navigable rows for a café's visit history. */
export function CafeVisitList({
  visits,
  limit = 5,
}: {
  readonly visits: readonly CafeVisitListItem[]
  readonly limit?: number
}) {
  const formatDate = useDateFormatter()
  const showRating = useTasteProfile().overallRating
  const sortedVisits = sortCafeVisitsByDate(visits)
  const shownVisits = sortedVisits.slice(0, limit)
  const remainingCount = sortedVisits.length - shownVisits.length

  return (
    <div className="space-y-1">
      {shownVisits.map((visit) => (
        <Link
          key={visit.id}
          to="/visits/$visitId"
          params={{ visitId: String(visit.id) }}
          className="flex min-h-11 items-center justify-between gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">
              {visit.drinkName || 'Coffee'}
            </span>
            {showRating && visit.rating ? (
              <StarRating
                value={visit.rating}
                readOnly
                variant="compact"
                sizeClassName="size-3.5"
                className="shrink-0 text-xs"
              />
            ) : null}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatDate(visit.visitedAt)}
          </span>
        </Link>
      ))}
      {remainingCount > 0 && (
        <p className="px-2 pt-1 text-sm text-muted-foreground">
          And {remainingCount} earlier{' '}
          {remainingCount === 1 ? 'visit' : 'visits'}…
        </p>
      )}
    </div>
  )
}
