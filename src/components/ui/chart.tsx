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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ChartRenderStatus = 'loading' | 'ready' | 'unavailable'

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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [renderStatus, setRenderStatus] =
    React.useState<ChartRenderStatus>('loading')

  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateStatus = () => {
      const surface = container.querySelector<SVGElement>('.recharts-surface')
      if (!surface) return
      const bounds = surface.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0) setRenderStatus('ready')
    }

    updateStatus()
    const observer = new MutationObserver(updateStatus)
    observer.observe(container, { childList: true, subtree: true })
    const unavailableTimer = window.setTimeout(
      () =>
        setRenderStatus((current) =>
          current === 'ready' ? current : 'unavailable',
        ),
      8_000,
    )

    return () => {
      observer.disconnect()
      window.clearTimeout(unavailableTimer)
    }
  }, [])

  return (
    <ChartProvider config={config}>
      <div
        data-chart={chartId}
        ref={containerRef}
        aria-busy={renderStatus === 'loading'}
        className={cn(
          "relative flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
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
        {renderStatus !== 'ready' ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg"
            role="status"
            aria-live="polite"
          >
            <Skeleton
              aria-hidden="true"
              className="absolute inset-0 h-full w-full bg-accent/70"
            />
            <span className="relative rounded-full bg-card px-4 py-2 font-semibold text-muted-foreground shadow-coffee">
              {renderStatus === 'loading'
                ? 'Loading chart…'
                : 'Chart unavailable'}
            </span>
          </div>
        ) : null}
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
