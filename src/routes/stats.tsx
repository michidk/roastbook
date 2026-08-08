import { createFileRoute } from "@tanstack/react-router"
import { Bean, Coffee, Scale, TrendingUp } from "lucide-react"
import { StatsSections } from "@/components/stats/stats-sections"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDetailedStats } from "@/lib/server/stats"
import { formatMeasurement, formatRatio } from "@/lib/stats-format"

export const Route = createFileRoute("/stats")({
  loader: () => getDetailedStats(),
  component: StatsPage,
})

function StatsPage() {
  const stats = Route.useLoaderData()
  const hasBrewingAverages = Object.values(stats.brewing).some((value) => value !== null)

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
          value={stats.shots.total}
          subtitle={`${stats.shots.avgPerDay}/day avg`}
          icon={Coffee}
        />
        <StatCard title="This Week" value={stats.shots.thisWeek} subtitle="shots pulled" icon={TrendingUp} />
        <StatCard title="This Month" value={stats.shots.thisMonth} subtitle="shots pulled" icon={TrendingUp} />
        <StatCard
          title="Beans Used"
          value={`${(stats.beans.totalGramsUsed / 1000).toFixed(1)} kg`}
          subtitle={`${stats.beans.uniqueBeansUsed} different beans`}
          icon={Bean}
        />
      </div>

      {hasBrewingAverages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Brewing Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Average label="Avg Dose" value={formatMeasurement(stats.brewing.avgDose, "g")} />
              <Average label="Avg Yield" value={formatMeasurement(stats.brewing.avgYield, "g")} />
              <Average label="Avg Ratio" value={formatRatio(stats.brewing.avgRatio)} />
              <Average label="Avg Time" value={formatMeasurement(stats.brewing.avgTime, "s")} />
            </div>
          </CardContent>
        </Card>
      )}

      <StatsSections stats={stats} />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  readonly title: string
  readonly value: string | number
  readonly subtitle: string
  readonly icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Average({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
