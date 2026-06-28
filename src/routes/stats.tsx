import { createFileRoute, Link } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts"
import { getDetailedStats } from "@/lib/server/stats"
import { Coffee, Bean, Scale, Star, TrendingUp } from "lucide-react"

export const Route = createFileRoute("/stats")({
  loader: async () => {
    return getDetailedStats()
  },
  component: StatsPage,
})

const activityChartConfig = {
  count: {
    label: "Shots",
    color: "oklch(var(--chart-1))",
  },
} satisfies ChartConfig

const ratingChartConfig = {
  count: {
    label: "Shots",
    color: "oklch(var(--chart-2))",
  },
} satisfies ChartConfig

const gearChartConfig = {
  shotCount: {
    label: "Shots",
    color: "oklch(var(--chart-3))",
  },
} satisfies ChartConfig

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="rounded-full bg-primary/10 p-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatsPage() {
  const stats = Route.useLoaderData()

  const shotsData = stats?.shots ?? { total: 0, thisWeek: 0, thisMonth: 0, avgPerDay: 0 }
  const beansData = stats?.beans ?? { totalGramsUsed: 0, uniqueBeansUsed: 0, topByShots: [], topByRating: [] }
  const brewingData = stats?.brewing ?? { avgDose: null, avgYield: null, avgTime: null, avgRatio: null }
  const gearData = stats?.gear ?? { grinders: [], machines: [] }
  const ratingsData = stats?.ratings ?? { average: null, totalRated: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  const activityData = stats?.activity ?? []

  const ratingDistribution = ratingsData.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  
  const ratingChartData = Object.entries(ratingDistribution).map(
    ([rating, count]) => ({
      rating: `${rating}★`,
      count,
    })
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Statistics
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Your coffee journey at a glance
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Shots"
          value={shotsData.total}
          subtitle={`${shotsData.avgPerDay}/day avg`}
          icon={Coffee}
        />
        <StatCard
          title="This Week"
          value={shotsData.thisWeek}
          subtitle="shots pulled"
          icon={TrendingUp}
        />
        <StatCard
          title="This Month"
          value={shotsData.thisMonth}
          subtitle="shots pulled"
          icon={TrendingUp}
        />
        <StatCard
          title="Beans Used"
          value={`${(beansData.totalGramsUsed / 1000).toFixed(1)}kg`}
          subtitle={`${beansData.uniqueBeansUsed} different beans`}
          icon={Bean}
        />
      </div>

      {brewingData.avgDose && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Brewing Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Dose</p>
                <p className="text-xl font-semibold">{brewingData.avgDose}g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Yield</p>
                <p className="text-xl font-semibold">{brewingData.avgYield}g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Ratio</p>
                <p className="text-xl font-semibold">1:{brewingData.avgRatio}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
                <p className="text-xl font-semibold">{brewingData.avgTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {activityData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Last 30 Days Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={activityChartConfig} className="h-[200px] w-full">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
            </CardContent>
          </Card>
        )}

        {ratingsData.totalRated > 0 && (
          <Card>
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
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {beansData.topByShots.length > 0 && (
          <Card>
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
          <Card>
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
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {gearData.grinders.length > 0 && (
          <Card>
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
          <Card>
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
