import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { activityChartConfig } from './stats-chart-config'
import type { DetailedStats } from './stats-types'

export function StatsActivityCard({
  trend,
  bucket,
}: {
  readonly trend: DetailedStats['trend']
  readonly bucket: DetailedStats['filter']['range']['bucket']
}) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const total = trend.reduce((sum, point) => sum + point.count, 0)
  const rated = trend.reduce((sum, point) => sum + point.totalRated, 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Brewing and quality trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatNumber(total)} brews across {formatNumber(trend.length)}{' '}
          {bucket === 'day' ? 'days' : bucket === 'week' ? 'weeks' : 'months'};{' '}
          {formatNumber(rated)} include a rating.
        </p>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <ChartContainer
            config={activityChartConfig}
            className="h-[240px] min-w-0 w-full"
          >
            <ComposedChart data={trend} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={12}
                minTickGap={24}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatDate(String(value))}
              />
              <YAxis
                yAxisId="count"
                allowDecimals={false}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="rating"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
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
                yAxisId="count"
                dataKey="count"
                fill="var(--color-count)"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
                isAnimationActive={false}
              />
              <Line
                yAxisId="rating"
                type="monotone"
                dataKey="averageRating"
                stroke="var(--color-averageRating)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-2xl bg-secondary px-6 text-center text-sm text-muted-foreground">
            Activity and quality will appear when this scope contains brews.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
