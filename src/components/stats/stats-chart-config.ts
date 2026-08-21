import type { ChartConfig } from '@/components/ui/chart'

export const activityChartConfig = {
  count: { label: 'Brews', color: 'var(--chart-1)' },
  averageRating: { label: 'Average rating', color: 'var(--chart-2)' },
} satisfies ChartConfig

export const brewCountChartConfig = {
  count: { label: 'Brews', color: 'var(--chart-1)' },
} satisfies ChartConfig

export const ratingChartConfig = {
  count: { label: 'Brews', color: 'var(--chart-2)' },
} satisfies ChartConfig

export const gearChartConfig = {
  shotCount: { label: 'Brews', color: 'var(--chart-3)' },
} satisfies ChartConfig

export const dialInChartConfig = {
  ratio: { label: 'Ratio', color: 'var(--chart-1)' },
  time: { label: 'Time', color: 'var(--chart-3)' },
  rating: { label: 'Rating', color: 'var(--chart-2)' },
} satisfies ChartConfig
