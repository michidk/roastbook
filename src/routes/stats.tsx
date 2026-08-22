import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Bean, Coffee, Star, Tags } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { MetricCard } from '@/components/metric-card'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { StatsFilters } from '@/components/stats/stats-filters'
import { StatsSections } from '@/components/stats/stats-sections'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { getDetailedStats } from '@/lib/server/stats'
import {
  percentChange,
  type StatsFilter,
  statsFilterSchema,
} from '@/lib/stats-filters'

export const Route = createFileRoute('/stats')({
  validateSearch: statsFilterSchema,
  loaderDeps: ({ search }) => ({
    period: search.period,
    method: search.method,
    bean: search.bean,
    from: search.from,
    to: search.to,
  }),
  loader: ({ deps }) => getDetailedStats({ data: deps }),
  staleTime: 15_000,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
  component: StatsPage,
})

function comparisonDetail(change: number | null): string {
  if (change === null) return 'No comparable previous period'
  if (change === 0) return 'Same as the previous period'
  return `${change > 0 ? '+' : ''}${change}% vs previous period`
}

function StatsPage() {
  const stats = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/stats' })
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const showRatings = useTasteProfile().overallRating
  const range = stats.filter.range
  const ratedShare =
    stats.shots.total > 0
      ? Math.round((stats.ratings.totalRated / stats.shots.total) * 100)
      : 0
  const shotChange = percentChange(stats.shots.total, stats.shots.previousTotal)
  const gramsChange = percentChange(
    stats.beans.totalGramsUsed,
    stats.beans.previousTotalGramsUsed,
  )
  const rangeLabel = range.start
    ? `${formatDate(range.start)}–${formatDate(range.end)}`
    : `Through ${formatDate(range.end)}`

  const updateSearch = (values: Partial<StatsFilter>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  return (
    <Page>
      <PageHeader
        title="Statistics"
        description={`${rangeLabel} · Calendar boundaries use ${stats.filter.timeZone}`}
      />

      <StatsFilters
        value={search}
        available={stats.available}
        onChange={updateSearch}
        onReset={() =>
          navigate({
            search: {
              period: '30d',
              method: undefined,
              bean: undefined,
              from: undefined,
              to: undefined,
            },
          })
        }
      />

      <section
        aria-label="Brewing overview"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Brews"
          value={formatNumber(stats.shots.total)}
          detail={`${formatNumber(stats.shots.avgPerDay)}/day · ${comparisonDetail(shotChange)}`}
          icon={Coffee}
        />
        <MetricCard
          label="Beans used"
          value={`${formatNumber((stats.beans.totalGramsUsed / 1000).toFixed(1))} kg`}
          detail={`${formatNumber(stats.beans.uniqueBeansUsed)} beans · ${comparisonDetail(gramsChange)}`}
          icon={Bean}
        />
        {showRatings ? (
          <>
            <MetricCard
              label="Average rating"
              value={
                stats.ratings.average === null ? (
                  '—'
                ) : (
                  <StarRating value={stats.ratings.average} variant="compact" />
                )
              }
              detail={
                stats.ratings.previousAverage === null ||
                stats.ratings.average === null
                  ? 'No comparable previous rating'
                  : `${stats.ratings.average - stats.ratings.previousAverage >= 0 ? '+' : ''}${formatNumber((stats.ratings.average - stats.ratings.previousAverage).toFixed(2))} vs previous period`
              }
              icon={Star}
            />
            <MetricCard
              label="Rated brews"
              value={`${formatNumber(ratedShare)}%`}
              detail={`${formatNumber(stats.ratings.totalRated)} of ${formatNumber(stats.shots.total)} brews`}
              icon={Tags}
            />
          </>
        ) : null}
      </section>

      {stats.shots.total === 0 ? (
        <EmptyState
          icon={Coffee}
          title="No brews in this scope"
          description="Adjust the filters or log a brew to start building these insights."
          actionLabel="Log a brew"
          actionHref="/brews/new"
        />
      ) : null}

      <StatsSections stats={stats} />

      {stats.shots.total === 0 ? (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/brews">View all brews</Link>
          </Button>
        </div>
      ) : null}
    </Page>
  )
}
