import type { ChartConfig } from "@/components/ui/chart"

export const activityChartConfig = {
  count: { label: "Shots", color: "var(--chart-1)" },
} satisfies ChartConfig

export const ratingChartConfig = {
  count: { label: "Shots", color: "var(--chart-2)" },
} satisfies ChartConfig

export const gearChartConfig = {
  shotCount: { label: "Shots", color: "var(--chart-3)" },
} satisfies ChartConfig
