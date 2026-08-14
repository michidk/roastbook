import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { StarRating } from '@/components/ui/star-rating'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { StatsActivityCard } from './stats-activity-card'
import {
  BrewingAveragesCard,
  BrewRhythmCard,
  ConsistencyCard,
  DialInCard,
  TasteProfileCard,
} from './stats-brewing-insights'
import { ratingChartConfig } from './stats-chart-config'
import {
  CostCard,
  ExplorationCard,
  GearUsageCard,
  MethodMixCard,
  RecipePerformanceCard,
} from './stats-exploration'
import type { DetailedStats } from './stats-types'
import { StatsVisitsCard } from './stats-visits-card'

type BeanRankingItem = DetailedStats['beans']['topByShots'][number] & {
  readonly avgRating?: number | null
}
type FormatNumber = (value: number | string) => string

const BEAN_RANKING_CONFIG = {
  usage: {
    title: 'Most used beans',
    renderDetail: (
      bean: BeanRankingItem,
      maxShots: number,
      formatNumber: FormatNumber,
    ) => (
      <Progress
        value={(bean.shotCount / maxShots) * 100}
        className="mt-1 h-2"
        aria-label={`${bean.beanName}: ${formatNumber(bean.shotCount)} brews`}
      />
    ),
    renderValue: (bean: BeanRankingItem, formatNumber: FormatNumber) =>
      `${formatNumber(bean.shotCount)} brews`,
  },
  rating: {
    title: 'Highest rated beans',
    renderDetail: (
      bean: BeanRankingItem,
      _maxShots: number,
      formatNumber: FormatNumber,
    ) => (
      <p className="text-sm text-muted-foreground">
        {formatNumber(bean.shotCount)} rated brews
      </p>
    ),
    renderValue: (bean: BeanRankingItem, _formatNumber: FormatNumber) =>
      bean.avgRating === null || bean.avgRating === undefined ? (
        '—'
      ) : (
        <StarRating value={bean.avgRating} variant="compact" />
      ),
  },
} satisfies Record<
  'usage' | 'rating',
  {
    readonly title: string
    readonly renderDetail: (
      bean: BeanRankingItem,
      maxShots: number,
      formatNumber: FormatNumber,
    ) => ReactNode
    readonly renderValue: (
      bean: BeanRankingItem,
      formatNumber: FormatNumber,
    ) => ReactNode
  }
>

function BeanRankingCard({
  mode,
  items,
}: {
  readonly mode: keyof typeof BEAN_RANKING_CONFIG
  readonly items: readonly BeanRankingItem[]
}) {
  const formatNumber = useNumberFormatter()
  const config = BEAN_RANKING_CONFIG[mode]
  const maxShots = items[0]?.shotCount ?? 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((bean, index) => (
          <div key={bean.beanId} className="flex items-center gap-3">
            <span className="w-6 text-sm font-medium text-muted-foreground">
              #{index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to="/beans/$beanId"
                params={{ beanId: String(bean.beanId) }}
                className="font-medium hover:underline"
              >
                {bean.beanName}
              </Link>
              {config.renderDetail(bean, maxShots, formatNumber)}
            </div>
            <span className="shrink-0 text-sm text-muted-foreground">
              {config.renderValue(bean, formatNumber)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function RatingDistributionCard({ stats }: { readonly stats: DetailedStats }) {
  const formatNumber = useNumberFormatter()
  const ratingChartData = Object.entries(stats.ratings.distribution).map(
    ([rating, count]) => ({ rating, count }),
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Rating distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          {stats.ratings.average === null ? (
            <span className="text-3xl font-bold">—</span>
          ) : (
            <StarRating
              value={stats.ratings.average}
              variant="compact"
              className="justify-center text-base"
              sizeClassName="size-5"
            />
          )}
          <p className="text-sm text-muted-foreground">
            {formatNumber(stats.ratings.totalRated)} rated brews;{' '}
            {formatNumber(stats.ratings.highRated)} are four or five stars.
          </p>
        </div>
        <ChartContainer config={ratingChartConfig} className="h-[170px] w-full">
          <BarChart data={ratingChartData} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="rating"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={4}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function StatsSections({ stats }: { readonly stats: DetailedStats }) {
  const hasBrews = stats.shots.total > 0
  const hasComparableParameters =
    Boolean(stats.filter.method) || stats.methods.length <= 1
  const hasBeanRankings =
    stats.beans.topByShots.length > 0 || stats.beans.topByRating.length > 0

  return (
    <div className="space-y-6 md:space-y-8">
      {hasBrews ? (
        <>
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <StatsActivityCard
              trend={stats.trend}
              bucket={stats.filter.range.bucket}
            />
            {stats.ratings.totalRated > 0 ? (
              <RatingDistributionCard stats={stats} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Rating distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-[240px] items-center justify-center rounded-2xl text-center text-sm text-muted-foreground">
                  Add ratings to reveal quality trends and dial-in patterns.
                </CardContent>
              </Card>
            )}
          </div>

          {hasComparableParameters ? (
            <>
              <BrewingAveragesCard brewing={stats.brewing} />
              <ConsistencyCard consistency={stats.consistency} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Brewing parameters</CardTitle>
              </CardHeader>
              <CardContent className="rounded-2xl text-sm text-muted-foreground">
                Choose one brewing method before comparing dose, ratio, yield,
                time, or consistency. Combining methods would make these values
                misleading.
              </CardContent>
            </Card>
          )}
          <DialInCard stats={stats} />
          <TasteProfileCard items={stats.tasteProfile} />

          <div className="grid gap-6 lg:grid-cols-2">
            <MethodMixCard methods={stats.methods} />
            <BrewRhythmCard
              rhythm={stats.rhythm}
              timeZone={stats.filter.timeZone}
            />
          </div>

          {hasBeanRankings ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {stats.beans.topByShots.length > 0 ? (
                <BeanRankingCard mode="usage" items={stats.beans.topByShots} />
              ) : null}
              {stats.beans.topByRating.length > 0 ? (
                <BeanRankingCard
                  mode="rating"
                  items={stats.beans.topByRating}
                />
              ) : null}
            </div>
          ) : null}

          <ExplorationCard exploration={stats.exploration} />
          <RecipePerformanceCard recipes={stats.exploration.recipes} />
        </>
      ) : null}

      <StatsVisitsCard visits={stats.visits} places={stats.places} />
      <CostCard stats={stats} />

      {hasBrews ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <GearUsageCard title="Brewer usage" items={stats.gear.brewers} />
          <GearUsageCard title="Grinder usage" items={stats.gear.grinders} />
          <GearUsageCard
            title="Accessory usage"
            items={stats.gear.accessories}
          />
        </div>
      ) : null}
    </div>
  )
}
