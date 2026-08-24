import { Link } from '@tanstack/react-router'
import { Activity, Gauge, Scale, Sparkles } from 'lucide-react'
import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { StarRating } from '@/components/ui/star-rating'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { highRatingRange } from '@/lib/stats-analysis'
import { formatMeasurement, formatRatio } from '@/lib/stats-format'
import { cn } from '@/lib/utils'
import { dialInChartConfig } from './stats-chart-config'
import type { DetailedStats } from './stats-types'

function Average({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function BrewingAveragesCard({
  brewing,
}: {
  readonly brewing: DetailedStats['brewing']
}) {
  const formatNumber = useNumberFormatter()
  if (!Object.values(brewing).some((value) => value !== null)) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Brewing averages
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Average
          label="Average dose"
          value={formatMeasurement(brewing.avgDose, 'g', formatNumber)}
        />
        <Average
          label="Average yield"
          value={formatMeasurement(brewing.avgYield, 'g', formatNumber)}
        />
        <Average
          label="Average ratio"
          value={formatRatio(brewing.avgRatio, formatNumber)}
        />
        <Average
          label="Average time"
          value={formatMeasurement(brewing.avgTime, 's', formatNumber)}
        />
      </CardContent>
    </Card>
  )
}

type ConsistencyMetric = DetailedStats['consistency']['dose']

function ConsistencyValue({
  label,
  metric,
  unit,
  ratio,
}: {
  readonly label: string
  readonly metric: ConsistencyMetric
  readonly unit?: string
  readonly ratio?: boolean
}) {
  const formatNumber = useNumberFormatter()
  if (
    metric.count < 3 ||
    metric.median === null ||
    metric.p25 === null ||
    metric.p75 === null
  ) {
    return (
      <div className="rounded-2xl bg-secondary/70 p-4">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">Needs 3 values</p>
      </div>
    )
  }
  const value = ratio
    ? `1:${formatNumber(metric.median.toFixed(2))}`
    : `${formatNumber(metric.median.toFixed(1))}${unit ? ` ${unit}` : ''}`
  const spread = `${formatNumber(metric.p25.toFixed(1))}–${formatNumber(metric.p75.toFixed(1))}${unit ? ` ${unit}` : ''}`
  return (
    <div className="rounded-2xl bg-secondary/70 p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">
        Middle 50%: {ratio ? `1:${spread}` : spread} ·{' '}
        {formatNumber(metric.count)} values
      </p>
    </div>
  )
}

export function ConsistencyCard({
  consistency,
}: {
  readonly consistency: DetailedStats['consistency']
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Consistency
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Median values and the middle half of recorded brews. A narrower range
          means more repeatable inputs.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ConsistencyValue label="Dose" metric={consistency.dose} unit="g" />
        <ConsistencyValue label="Yield" metric={consistency.yield} unit="g" />
        <ConsistencyValue label="Ratio" metric={consistency.ratio} ratio />
        <ConsistencyValue label="Time" metric={consistency.time} unit="s" />
      </CardContent>
    </Card>
  )
}

export function DialInCard({ stats }: { readonly stats: DetailedStats }) {
  const formatNumber = useNumberFormatter()
  const isFocused = Boolean(stats.filter.method && stats.filter.bean)
  const points = stats.dialIn.filter(
    (point) => point.rating > 0 && point.ratio !== null,
  )
  const ratioRange = highRatingRange(
    points.map((point) => ({ value: point.ratio, rating: point.rating })),
  )
  const timeRange = highRatingRange(
    points.map((point) => ({ value: point.time, rating: point.rating })),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Dial-in explorer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Observed patterns only; ratings do not prove that a parameter caused
          the result.
        </p>
      </CardHeader>
      <CardContent>
        {!isFocused ? (
          <div className="rounded-2xl bg-secondary/70 p-5 text-center sm:p-6 text-sm text-muted-foreground">
            Choose both a brewing method and a bean to compare like-for-like
            brews.
          </div>
        ) : points.length < 5 ? (
          <div className="rounded-2xl bg-secondary/70 p-5 text-center sm:p-6 text-sm text-muted-foreground">
            This combination needs at least five rated brews with a calculable
            ratio.
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ChartContainer
              config={dialInChartConfig}
              className="h-[260px] min-w-0 w-full"
            >
              <ScatterChart accessibilityLayer>
                <XAxis
                  type="number"
                  dataKey="ratio"
                  name="Ratio"
                  domain={['dataMin - 0.1', 'dataMax + 0.1']}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  type="number"
                  dataKey="rating"
                  name="Rating"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <ZAxis type="number" dataKey="time" name="Time" unit=" s" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter
                  data={points}
                  fill="var(--color-rating)"
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ChartContainer>
            <div className="space-y-3">
              <p className="font-semibold">Observed high-rating range</p>
              {ratioRange ? (
                <p className="text-sm text-muted-foreground">
                  {formatNumber(ratioRange.count)} four- or five-star brews were
                  between 1:{formatNumber(ratioRange.minimum.toFixed(2))} and 1:
                  {formatNumber(ratioRange.maximum.toFixed(2))}.
                </p>
              ) : null}
              {timeRange ? (
                <p className="text-sm text-muted-foreground">
                  Their recorded times ranged from{' '}
                  {formatNumber(timeRange.minimum.toFixed(1))}–
                  {formatNumber(timeRange.maximum.toFixed(1))} seconds.
                </p>
              ) : null}
              {!ratioRange && !timeRange ? (
                <p className="text-sm text-muted-foreground">
                  Log at least three four- or five-star brews to calculate a
                  high-rating range.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Showing the latest {formatNumber(points.length)} comparable
                rated brews.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TasteProfileCard({
  items,
}: {
  readonly items: DetailedStats['tasteProfile']
}) {
  const formatNumber = useNumberFormatter()
  const showRatings = useTasteProfile().overallRating
  const maxCount = Math.max(1, ...items.map((item) => item.count))
  const plotted = items.filter(
    (item) => item.extractionAxis !== null && item.strengthAxis !== null,
  )

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Taste profile
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {showRatings
            ? 'The most frequently recorded sensations and their average ratings.'
            : 'The most frequently recorded sensations.'}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {items.slice(0, 8).map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {showRatings && item.avgRating !== null ? (
                    <StarRating value={item.avgRating} variant="compact" />
                  ) : null}
                  {formatNumber(item.count)}
                </span>
              </div>
              <Progress
                value={(item.count / maxCount) * 100}
                className="mt-1.5 h-2"
                aria-label={`${item.name}: ${formatNumber(item.count)} brews`}
              />
            </div>
          ))}
        </div>
        {plotted.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold">Extraction map</p>
            <div
              className="relative h-64 overflow-hidden rounded-2xl border bg-secondary/50"
              role="img"
              aria-label={plotted
                .map(
                  (item) =>
                    `${item.name}, extraction ${item.extractionAxis}, strength ${item.strengthAxis}`,
                )
                .join('; ')}
            >
              <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              <div className="absolute inset-y-0 left-1/2 border-l border-border" />
              <span className="absolute bottom-2 left-3 text-xs text-muted-foreground">
                Under
              </span>
              <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">
                Over
              </span>
              <span className="absolute top-2 left-3 text-xs text-muted-foreground">
                Strong
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                Light
              </span>
              {plotted.map((item) => (
                <span
                  key={item.id}
                  title={`${item.name}: ${item.count} brews`}
                  className={cn(
                    'absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm',
                    item.category?.toLowerCase() === 'defect' ||
                      item.category?.toLowerCase() === 'negative'
                      ? 'bg-destructive'
                      : 'bg-primary',
                  )}
                  style={{
                    left: `${Math.max(3, Math.min(97, (item.extractionAxis ?? 0.5) * 100))}%`,
                    top: `${Math.max(3, Math.min(97, (1 - (item.strengthAxis ?? 0.5)) * 100))}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAYPARTS = [
  { label: 'Night', start: 0, end: 5 },
  { label: 'Morning', start: 6, end: 11 },
  { label: 'Afternoon', start: 12, end: 17 },
  { label: 'Evening', start: 18, end: 23 },
] as const

export function BrewRhythmCard({
  rhythm,
  timeZone,
}: {
  readonly rhythm: DetailedStats['rhythm']
  readonly timeZone: string
}) {
  const formatNumber = useNumberFormatter()
  const cells = WEEKDAYS.flatMap((weekday, weekdayIndex) =>
    DAYPARTS.map((part) => ({
      weekday,
      part: part.label,
      count: rhythm.cells
        .filter(
          (cell) =>
            cell.weekday === weekdayIndex + 1 &&
            cell.hour >= part.start &&
            cell.hour <= part.end,
        )
        .reduce((sum, cell) => sum + cell.count, 0),
    })),
  )
  const maxCount = Math.max(1, ...cells.map((cell) => cell.count))
  const busiest = [...cells].sort((a, b) => b.count - a.count)[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brew rhythm</CardTitle>
        <p className="text-sm text-muted-foreground">
          {busiest?.count
            ? `${busiest.weekday} ${busiest.part.toLowerCase()} is the busiest window with ${formatNumber(busiest.count)} brews.`
            : 'No time-of-day pattern is available for this scope.'}{' '}
          Times use {timeZone}.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-secondary/70 p-4">
            <p className="text-sm text-muted-foreground">Current streak</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(rhythm.streaks.current)} days
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/70 p-4">
            <p className="text-sm text-muted-foreground">Longest streak</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatNumber(rhythm.streaks.longest)} days
            </p>
          </div>
        </div>
        <Table className="min-w-[520px] border-separate border-spacing-1 text-center text-xs">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead scope="col" className="p-2 text-left">
                Day
              </TableHead>
              {DAYPARTS.map((part) => (
                <TableHead
                  key={part.label}
                  scope="col"
                  className="p-2 text-center font-medium"
                >
                  {part.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {WEEKDAYS.map((weekday) => (
              <TableRow key={weekday} className="border-0 hover:bg-transparent">
                <TableHead scope="row" className="p-2 text-left font-medium">
                  {weekday}
                </TableHead>
                {DAYPARTS.map((part) => {
                  const cell = cells.find(
                    (candidate) =>
                      candidate.weekday === weekday &&
                      candidate.part === part.label,
                  )
                  const intensity = cell ? cell.count / maxCount : 0
                  return (
                    <TableCell
                      key={part.label}
                      className="h-10 rounded-lg border border-border text-center tabular-nums"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round(intensity * 75)}%, var(--secondary))`,
                      }}
                      aria-label={`${weekday} ${part.label.toLowerCase()}: ${cell?.count ?? 0} brews`}
                    >
                      {cell?.count ? formatNumber(cell.count) : '–'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Link
          to="/settings"
          className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
        >
          Change statistics time zone
        </Link>
      </CardContent>
    </Card>
  )
}
