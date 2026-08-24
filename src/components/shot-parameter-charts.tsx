import { type ReactNode, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useDateFormatter } from '@/hooks/use-date-formatter'

type Shot = {
  id: number
  doseGrams: string | null
  yieldGrams: string | null
  grindSetting: string | null
  shotTimeSeconds: string | null
  brewedAt: Date | string
}

type ShotParameterChartsProps = {
  shots: Shot[]
  totalShots?: number
}

const chartConfig = {
  dose: {
    label: 'Dose (g)',
    color: 'var(--chart-1)',
  },
  yield: {
    label: 'Yield (g)',
    color: 'var(--chart-2)',
  },
  grind: {
    label: 'Grind',
    color: 'var(--chart-3)',
  },
  time: {
    label: 'Time (s)',
    color: 'var(--chart-4)',
  },
  ratio: {
    label: 'Ratio',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig

function parseGrindSetting(grindSetting: string | null): number | null {
  if (!grindSetting) return null
  const num = parseFloat(grindSetting.replace(/[^\d.-]/g, ''))
  return Number.isNaN(num) ? null : num
}

type ChartDatum = {
  readonly index: number
  readonly date: string
  readonly dose: number | null
  readonly yield: number | null
  readonly grind: number | null
  readonly time: number | null
  readonly ratio: number | null
}

function ShotLineChartSection({
  title,
  data,
  unit,
  children,
}: {
  readonly title: string
  readonly data: readonly ChartDatum[]
  readonly unit?: string
  readonly children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            unit={unit}
            domain={['auto', 'auto']}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {children}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

export function ShotParameterCharts({
  shots,
  totalShots = shots.length,
}: ShotParameterChartsProps) {
  const formatDate = useDateFormatter()
  const chartData = useMemo(() => {
    const sortedShots = [...shots].sort(
      (a, b) => new Date(a.brewedAt).getTime() - new Date(b.brewedAt).getTime(),
    )

    return sortedShots.map((shot, index) => {
      const dose = shot.doseGrams ? parseFloat(shot.doseGrams) : null
      const yieldG = shot.yieldGrams ? parseFloat(shot.yieldGrams) : null
      const grind = parseGrindSetting(shot.grindSetting)
      const ratio =
        dose && yieldG ? Math.round((yieldG / dose) * 100) / 100 : null

      return {
        index: index + 1,
        date: formatDate(shot.brewedAt),
        dose,
        yield: yieldG,
        grind,
        time: shot.shotTimeSeconds ? parseFloat(shot.shotTimeSeconds) : null,
        ratio,
      }
    })
  }, [formatDate, shots])

  const hasDoseData = chartData.some((d) => d.dose !== null)
  const hasYieldData = chartData.some((d) => d.yield !== null)
  const hasGrindData = chartData.some((d) => d.grind !== null)
  const hasTimeData = chartData.some((d) => d.time !== null)

  if (shots.length < 2) {
    return null
  }

  if (!hasDoseData && !hasYieldData && !hasGrindData && !hasTimeData) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brew parameters over time</CardTitle>
        <CardDescription>
          {totalShots > shots.length
            ? `Latest ${shots.length} of ${totalShots} brews`
            : `${totalShots} ${totalShots === 1 ? 'brew' : 'brews'}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        {(hasDoseData || hasYieldData) && (
          <ShotLineChartSection title="Dose & yield" data={chartData}>
            {hasDoseData && (
              <Line
                type="monotone"
                dataKey="dose"
                stroke="var(--color-dose)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
            {hasYieldData && (
              <Line
                type="monotone"
                dataKey="yield"
                stroke="var(--color-yield)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </ShotLineChartSection>
        )}

        {hasGrindData && (
          <ShotLineChartSection title="Grind setting" data={chartData}>
            <Line
              type="monotone"
              dataKey="grind"
              stroke="var(--color-grind)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </ShotLineChartSection>
        )}

        {hasTimeData && (
          <ShotLineChartSection title="Brew time" data={chartData} unit="s">
            <Line
              type="monotone"
              dataKey="time"
              stroke="var(--color-time)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </ShotLineChartSection>
        )}
      </CardContent>
    </Card>
  )
}
