import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { activityChartConfig } from "./stats-chart-config"

type ActivityDay = {
  readonly date: string
  readonly count: number
}

function formatActivityDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function StatsActivityCard({ activity }: { readonly activity: readonly ActivityDay[] }) {
  const recentShotCount = activity.reduce((total, day) => total + day.count, 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Last 30 Days Activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          {recentShotCount} {recentShotCount === 1 ? "shot" : "shots"} logged in this window.
        </p>
      </CardHeader>
      <CardContent>
        {recentShotCount > 0 ? (
          <ChartContainer config={activityChartConfig} className="h-[200px] min-w-0 w-full">
            <LineChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={14}
                minTickGap={24}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatActivityDate}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, "dataMax + 1"]}
                fontSize={14}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-2xl bg-secondary px-6 text-center">
            <div className="space-y-1">
              <p className="font-display font-bold">No recent shots</p>
              <p className="text-sm text-muted-foreground">
                Activity will appear here after the next logged shot.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
