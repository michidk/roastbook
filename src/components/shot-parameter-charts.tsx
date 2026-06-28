import { useMemo } from "react"
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
  doseGrams: string | null
  yieldGrams: string | null
  grindSetting: string | null
  brewTimeSeconds: number | null
  createdAt: Date | string
}

type ShotParameterChartsProps = {
  shots: Shot[]
}

const chartConfig = {
  dose: {
    label: "Dose (g)",
    color: "oklch(var(--chart-1))",
  },
  yield: {
    label: "Yield (g)",
    color: "oklch(var(--chart-2))",
  },
  grind: {
    label: "Grind",
    color: "oklch(var(--chart-3))",
  },
  time: {
    label: "Time (s)",
    color: "oklch(var(--chart-4))",
  },
  ratio: {
    label: "Ratio",
    color: "oklch(var(--chart-5))",
  },
} satisfies ChartConfig

function formatDate(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function parseGrindSetting(grindSetting: string | null): number | null {
  if (!grindSetting) return null
  const num = parseFloat(grindSetting.replace(/[^\d.-]/g, ""))
  return isNaN(num) ? null : num
}

export function ShotParameterCharts({ shots }: ShotParameterChartsProps) {
  const chartData = useMemo(() => {
    const sortedShots = [...shots].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return sortedShots.map((shot, index) => {
      const dose = shot.doseGrams ? parseFloat(shot.doseGrams) : null
      const yieldG = shot.yieldGrams ? parseFloat(shot.yieldGrams) : null
      const grind = parseGrindSetting(shot.grindSetting)
      const ratio = dose && yieldG ? Math.round((yieldG / dose) * 100) / 100 : null

      return {
        index: index + 1,
        date: formatDate(shot.createdAt),
        dose,
        yield: yieldG,
        grind,
        time: shot.brewTimeSeconds,
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
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Dose & Yield
            </p>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
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
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {hasGrindData && (
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Grind Setting
            </p>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="grind"
                  stroke="var(--color-grind)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {hasTimeData && (
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Brew Time
            </p>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="s" domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="var(--color-time)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
