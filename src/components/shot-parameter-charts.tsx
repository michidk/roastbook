import { useMemo, type ReactNode } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Shot = {
  id: number
  actualDoseGrams: string | null
  actualYieldGrams: string | null
  grindSetting: string | null
  actualShotTimeSeconds: string | null
  createdAt: Date | string
}

type ShotParameterChartsProps = {
  shots: Shot[]
}

const chartConfig = {
  dose: {
    label: "Dose (g)",
    color: "var(--chart-1)",
  },
  yield: {
    label: "Yield (g)",
    color: "var(--chart-2)",
  },
  grind: {
    label: "Grind",
    color: "var(--chart-3)",
  },
  time: {
    label: "Time (s)",
    color: "var(--chart-4)",
  },
  ratio: {
    label: "Ratio",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

function formatDate(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function parseGrindSetting(grindSetting: string | null): number | null {
  if (!grindSetting) return null
  const num = parseFloat(grindSetting.replace(/[^\d.-]/g, ""))
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
          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            unit={unit}
            domain={["auto", "auto"]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {children}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

export function ShotParameterCharts({ shots }: ShotParameterChartsProps) {
  const chartData = useMemo(() => {
    const sortedShots = [...shots].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return sortedShots.map((shot, index) => {
      const dose = shot.actualDoseGrams ? parseFloat(shot.actualDoseGrams) : null
      const yieldG = shot.actualYieldGrams ? parseFloat(shot.actualYieldGrams) : null
      const grind = parseGrindSetting(shot.grindSetting)
      const ratio = dose && yieldG ? Math.round((yieldG / dose) * 100) / 100 : null

      return {
        index: index + 1,
        date: formatDate(shot.createdAt),
        dose,
        yield: yieldG,
        grind,
        time: shot.actualShotTimeSeconds
          ? parseFloat(shot.actualShotTimeSeconds)
          : null,
        ratio,
      }
    })
  }, [shots])

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
        <CardTitle>Shot Parameters Over Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(hasDoseData || hasYieldData) && (
          <ShotLineChartSection title="Dose & Yield" data={chartData}>
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
          <ShotLineChartSection title="Grind Setting" data={chartData}>
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
          <ShotLineChartSection title="Brew Time" data={chartData} unit="s">
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
