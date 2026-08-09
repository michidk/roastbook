import { Link } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import type { getDetailedStats } from "@/lib/server/stats"
import { Star } from "lucide-react"
import { gearChartConfig, ratingChartConfig } from "./stats-chart-config"
import { StatsActivityCard } from "./stats-activity-card"
import { StatsVisitsCard } from "./stats-visits-card"

type DetailedStats = Awaited<ReturnType<typeof getDetailedStats>>

export function StatsSections({ stats }: { readonly stats: DetailedStats }) {
  const beansData = stats.beans
  const gearData = stats.gear
  const ratingsData = stats.ratings
  const activityData = stats.activity

  const ratingDistribution = ratingsData.distribution
  const ratingChartData = Object.entries(ratingDistribution).map(
    ([rating, count]) => ({
      rating: `${rating}★`,
      count,
    })
  )

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className={ratingsData.totalRated === 0 ? "min-w-0 lg:col-span-2" : "min-w-0"}>
          <StatsActivityCard activity={activityData} />
        </div>

        {ratingsData.totalRated > 0 && (
          <Card className={beansData.topByRating.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <span className="text-3xl font-bold">{ratingsData.average}</span>
                <span className="text-muted-foreground"> avg rating</span>
                <p className="text-sm text-muted-foreground">
                  {ratingsData.totalRated} rated shots
                </p>
              </div>
              <ChartContainer config={ratingChartConfig} className="h-[150px] w-full">
                <BarChart data={ratingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" fontSize={12} tickLine={false} axisLine={false} />
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
          <Card className={beansData.topByRating.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>Most Used Beans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {beansData.topByShots.map((bean, index) => (
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
                    <Progress
                      value={
                        (bean.shotCount / beansData.topByShots[0].shotCount) * 100
                      }
                      className="mt-1 h-2"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {bean.shotCount} shots
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {beansData.topByRating.length > 0 && (
          <Card className={beansData.topByShots.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>Highest Rated Beans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {beansData.topByRating.map((bean, index) => (
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
                    <p className="text-sm text-muted-foreground">
                      {bean.shotCount} shots
                    </p>
                  </div>
                  <span className="flex items-center gap-1 font-medium">
                    {bean.avgRating}
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <StatsVisitsCard visits={stats.visits} places={stats.places} />

      <div className="grid gap-6 lg:grid-cols-2">
        {gearData.grinders.length > 0 && (
          <Card className={gearData.machines.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>Grinder Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={gearChartConfig} className="h-[200px] w-full">
                <BarChart data={gearData.grinders} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
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
        )}

        {gearData.machines.length > 0 && (
          <Card className={gearData.grinders.length === 0 ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>Machine Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={gearChartConfig} className="h-[200px] w-full">
                <BarChart data={gearData.machines} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
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
        )}
      </div>
    </div>
  )
}
