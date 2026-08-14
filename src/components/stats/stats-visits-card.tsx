import { Link } from '@tanstack/react-router'
import { CalendarDays, Heart, MapPin, Star } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { MetricCard } from '@/components/metric-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { percentChange } from '@/lib/stats-filters'
import type { DetailedStats } from './stats-types'

type StatsVisitsCardProps = {
  readonly visits: DetailedStats['visits']
  readonly places: DetailedStats['places']
}

const visitChartConfig = {
  count: { label: 'Visits', color: 'var(--chart-4)' },
} satisfies ChartConfig

function RankedList({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly {
    readonly name: string | null
    readonly count: number
    readonly avgRating?: number | null
  }[]
}) {
  const formatNumber = useNumberFormatter()
  return (
    <section>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No data in this period.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-muted-foreground">#{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.name}
              </span>
              {item.avgRating !== null && item.avgRating !== undefined ? (
                <StarRating value={item.avgRating} variant="compact" />
              ) : null}
              <span className="text-muted-foreground">
                {formatNumber(item.count)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function StatsVisitsCard({ visits, places }: StatsVisitsCardProps) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const visitChange = percentChange(visits.total, visits.previousTotal)
  const highestVisitCount = Math.max(
    1,
    ...places.topByVisits.map((place) => place.visitCount),
  )

  return (
    <Card aria-labelledby="visits-places-heading">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="visits-places-heading"
              className="flex items-center gap-2 font-display text-lg leading-snug font-bold tracking-tight"
            >
              <MapPin className="h-5 w-5" />
              Visits &amp; cafés
            </h2>
            <CardDescription>
              Café habits across {formatNumber(places.total)} saved{' '}
              {places.total === 1 ? 'café' : 'cafés'} in the selected period
            </CardDescription>
          </div>
          <Link
            to="/visits"
            className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
          >
            View visits
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Visits"
            value={formatNumber(visits.total)}
            detail={
              visitChange === null
                ? 'No comparable previous period'
                : `${visitChange > 0 ? '+' : ''}${visitChange}% vs previous period`
            }
            icon={CalendarDays}
            variant="quiet"
          />
          <MetricCard
            label="Cafés explored"
            value={formatNumber(places.visited)}
            detail={`${formatNumber(places.favorites)} saved favorites`}
            icon={MapPin}
            variant="quiet"
          />
          <MetricCard
            label="Average rating"
            value={
              visits.averageRating === null ? (
                '—'
              ) : (
                <StarRating value={visits.averageRating} variant="compact" />
              )
            }
            detail={`${formatNumber(visits.totalRated)} rated visits`}
            icon={Star}
            variant="quiet"
          />
          <MetricCard
            label="Longest visit streak"
            value={`${formatNumber(visits.streaks.longest)} days`}
            detail={`${formatNumber(visits.streaks.current)}-day current streak`}
            icon={CalendarDays}
            variant="quiet"
          />
        </div>

        {visits.trend.length > 0 ? (
          <section aria-labelledby="visit-trend-heading">
            <h3
              id="visit-trend-heading"
              className="font-display text-base font-bold"
            >
              Visit trend
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatNumber(visits.total)} visits are distributed across the
              visible periods.
            </p>
            <ChartContainer
              config={visitChartConfig}
              className="mt-3 h-[190px] w-full"
            >
              <BarChart data={visits.trend} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(String(value))}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatDate(String(value))}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </section>
        ) : null}

        {places.topByVisits.length > 0 ? (
          <section
            aria-labelledby="most-visited-places-heading"
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="most-visited-places-heading"
                className="font-display text-base font-bold"
              >
                Most visited cafés
              </h3>
              {places.favorites > 0 ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 fill-favorite text-favorite" />
                  {formatNumber(places.favorites)} saved favorite
                  {places.favorites === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <div className="space-y-4">
              {places.topByVisits.map((place, index) => (
                <div
                  key={place.coffeeShopId}
                  className="flex min-w-0 items-start gap-3"
                >
                  <span className="w-6 shrink-0 text-sm leading-11 font-medium text-muted-foreground lg:leading-normal">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <Link
                          to="/shops/$coffeeShopId"
                          params={{ coffeeShopId: String(place.coffeeShopId) }}
                          className="inline-flex min-h-11 items-center rounded-md py-3 font-medium underline-offset-4 hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0 [@media(hover:hover)_and_(pointer:fine)]:py-0"
                        >
                          {place.coffeeShopName}
                        </Link>
                        {place.city ? (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {place.city}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                        {place.avgRating !== null ? (
                          <StarRating
                            value={place.avgRating}
                            variant="compact"
                          />
                        ) : null}
                        <span className="tabular-nums">
                          {formatNumber(place.visitCount)}{' '}
                          {place.visitCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={(place.visitCount / highestVisitCount) * 100}
                      className="mt-1.5 h-2"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
            {visits.total === 0
              ? 'Log a visit to start seeing café patterns here.'
              : 'Link visits to saved cafés to build a café ranking.'}
          </div>
        )}

        {visits.total > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <RankedList title="Drink types" items={visits.drinkTypes} />
            <RankedList title="Cities" items={visits.cities} />
            <RankedList title="Visit taste tags" items={visits.tasteTags} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
