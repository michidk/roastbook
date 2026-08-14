import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart-content'
import {
  CHART_THEMES,
  type ChartConfig,
  ChartProvider,
} from '@/components/ui/chart-context'
import { cn } from '@/lib/utils'

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    readonly config: ChartConfig
    readonly children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children']
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartProvider config={config}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          minWidth={0}
          minHeight={0}
          // Recharts defaults this to {width:-1,height:-1} pre-measurement, which logs a
          // console warning and renders nothing during SSR. Charts here use h-[150/200px],
          // so seed a same-height positive guess; ResizeObserver corrects it after mount.
          initialDimension={{ width: 400, height: 200 }}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartProvider>
  )
})
ChartContainer.displayName = 'Chart'

function ChartStyle({
  id,
  config,
}: {
  readonly id: string
  readonly config: ChartConfig
}) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.theme || item.color,
  )
  if (colorConfig.length === 0) return null

  const css = CHART_THEMES.map(
    ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const color = item.theme?.[theme] || item.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
  ).join('\n')

  return <style>{css}</style>
}

export type { ChartConfig }
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
}
