import { createFileRoute } from '@tanstack/react-router'
import { Bean, Coffee, Scale, TrendingUp } from 'lucide-react'
import { MetricCard } from '@/components/metric-card'
import { Page, PageHeader } from '@/components/page-layout'
import { StatsSections } from '@/components/stats/stats-sections'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getDetailedStats } from '@/lib/server/stats'
import { formatMeasurement, formatRatio } from '@/lib/stats-format'

export const Route = createFileRoute('/stats')({
  loader: () => getDetailedStats(),
  component: StatsPage,
})

function StatsPage() {
  const stats = Route.useLoaderData()
  const formatNumber = useNumberFormatter()
  const hasBrewingAverages = Object.values(stats.brewing).some(
    (value) => value !== null,
  )

  return (
    <Page>
      <PageHeader
        title="Statistics"
        description="Your coffee journey at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total shots"
          value={formatNumber(stats.shots.total)}
          detail={`${formatNumber(stats.shots.avgPerDay)}/day average`}
          icon={Coffee}
        />
        <MetricCard
          label="This week"
          value={formatNumber(stats.shots.thisWeek)}
          detail="shots pulled"
          icon={TrendingUp}
        />
        <MetricCard
          label="This month"
          value={formatNumber(stats.shots.thisMonth)}
          detail="shots pulled"
          icon={TrendingUp}
        />
        <MetricCard
          label="Beans used"
          value={`${formatNumber((stats.beans.totalGramsUsed / 1000).toFixed(1))} kg`}
          detail={`${formatNumber(stats.beans.uniqueBeansUsed)} different beans`}
          icon={Bean}
        />
      </div>

      {hasBrewingAverages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Brewing averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Average
                label="Average dose"
                value={formatMeasurement(
                  stats.brewing.avgDose,
                  'g',
                  formatNumber,
                )}
              />
              <Average
                label="Average yield"
                value={formatMeasurement(
                  stats.brewing.avgYield,
                  'g',
                  formatNumber,
                )}
              />
              <Average
                label="Average ratio"
                value={formatRatio(stats.brewing.avgRatio, formatNumber)}
              />
              <Average
                label="Average time"
                value={formatMeasurement(
                  stats.brewing.avgTime,
                  's',
                  formatNumber,
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <StatsSections stats={stats} />
    </Page>
  )
}

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
