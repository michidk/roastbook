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
import type { getDetailedStats } from '@/lib/server/stats'
import { StatsActivityCard } from './stats-activity-card'
import { gearChartConfig, ratingChartConfig } from './stats-chart-config'
import { StatsVisitsCard } from './stats-visits-card'

type DetailedStats = Awaited<ReturnType<typeof getDetailedStats>>

type BeanRankingItem = {
  readonly beanId: number | null
  readonly beanName: string
  readonly shotCount: number
  readonly avgRating?: number | null
}

type GearUsageItem = {
  readonly gearId: number
  readonly gearName: string
  readonly shotCount: number
}

type FormatNumber = (value: number | string) => string

const BEAN_RANKING_CONFIG = {
  usage: {
    title: 'Most used beans',
    renderDetail: (
      bean: BeanRankingItem,
      maxShots: number,
      _formatNumber: FormatNumber,
    ) => (
      <Progress
        value={(bean.shotCount / maxShots) * 100}
        className="mt-1 h-2"
      />
    ),
    renderValue: (bean: BeanRankingItem, formatNumber: FormatNumber) =>
      `${formatNumber(bean.shotCount)} shots`,
  },
  rating: {
    title: 'Highest rated beans',
    renderDetail: (
      bean: BeanRankingItem,
      _maxShots: number,
      formatNumber: FormatNumber,
    ) => (
      <p className="text-sm text-muted-foreground">
        {formatNumber(bean.shotCount)} shots
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
  className,
}: {
  readonly mode: keyof typeof BEAN_RANKING_CONFIG
  readonly items: readonly BeanRankingItem[]
  readonly className?: string
}) {
  const formatNumber = useNumberFormatter()
  const config = BEAN_RANKING_CONFIG[mode]
  const maxShots = items[0]?.shotCount ?? 1

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((bean, index) => (
          <div key={bean.beanId} className="flex items-center gap-3">
            <span className="w-6 text-sm font-medium text-muted-foreground">
              #{index + 1}
            </span>
            <div className="flex-1">
              <Link
                to="/beans/$beanId"
                params={{ beanId: String(bean.beanId) }}
                className="font-medium hover:underline"
              >
                {bean.beanName}
              </Link>
              {config.renderDetail(bean, maxShots, formatNumber)}
            </div>
            <span className="text-sm text-muted-foreground">
              {config.renderValue(bean, formatNumber)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function GearUsageCard({
  title,
  items,
  className,
}: {
  readonly title: string
  readonly items: readonly GearUsageItem[]
  readonly className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={gearChartConfig} className="h-[200px] w-full">
          <BarChart data={items} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="gearName"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="shotCount" fill="var(--color-shotCount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function StatsSections({ stats }: { readonly stats: DetailedStats }) {
  const formatNumber = useNumberFormatter()
  const beansData = stats.beans
  const gearData = stats.gear
  const ratingsData = stats.ratings
  const activityData = stats.activity

  const ratingDistribution = ratingsData.distribution
  const ratingChartData = Object.entries(ratingDistribution).map(
    ([rating, count]) => ({
      rating,
      count,
    }),
  )

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div
          className={
            ratingsData.totalRated === 0 ? 'min-w-0 lg:col-span-2' : 'min-w-0'
          }
        >
          <StatsActivityCard activity={activityData} />
        </div>

        {ratingsData.totalRated > 0 && (
          <Card
            className={
              beansData.topByRating.length === 0 ? 'lg:col-span-2' : undefined
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rating distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                {ratingsData.average === null ? (
                  <span className="text-3xl font-bold">—</span>
                ) : (
                  <StarRating
                    value={ratingsData.average}
                    variant="compact"
                    className="justify-center text-base"
                    sizeClassName="size-5"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {formatNumber(ratingsData.totalRated)} rated shots
                </p>
              </div>
              <ChartContainer
                config={ratingChartConfig}
                className="h-[150px] w-full"
              >
                <BarChart data={ratingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rating"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {beansData.topByShots.length > 0 && (
          <BeanRankingCard
            mode="usage"
            items={beansData.topByShots}
            className={
              beansData.topByRating.length === 0 ? 'lg:col-span-2' : undefined
            }
          />
        )}

        {beansData.topByRating.length > 0 && (
          <BeanRankingCard
            mode="rating"
            items={beansData.topByRating}
            className={
              beansData.topByShots.length === 0 ? 'lg:col-span-2' : undefined
            }
          />
        )}
      </div>

      <StatsVisitsCard visits={stats.visits} places={stats.places} />

      <div className="grid gap-6 lg:grid-cols-2">
        {gearData.grinders.length > 0 && (
          <GearUsageCard
            title="Grinder usage"
            items={gearData.grinders}
            className={
              gearData.machines.length === 0 ? 'lg:col-span-2' : undefined
            }
          />
        )}

        {gearData.machines.length > 0 && (
          <GearUsageCard
            title="Machine usage"
            items={gearData.machines}
            className={
              gearData.grinders.length === 0 ? 'lg:col-span-2' : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
