import { Gauge } from 'lucide-react'
import { PanelSection } from '@/components/section-layout'
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { cn } from '@/lib/utils'
import {
  type IntegrationRateLimit,
  RATE_LIMIT_WINDOW_LABELS,
  rateLimitPercent,
} from '@/modules/integrations/rate-limit'

/** The account's shared API and MCP allowance and how much of it is used. */
export function RateLimitUsage({
  rateLimit,
}: {
  readonly rateLimit: IntegrationRateLimit | null
}) {
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()
  if (!rateLimit) return null
  return (
    <PanelSection
      title="Rate limits"
      description="API keys, MCP tokens and connected applications share these limits. Responses report them in RateLimit and X-RateLimit headers."
      action={<Gauge aria-hidden="true" className="size-5 text-link" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {rateLimit.windows.map((window) => {
          const percent = rateLimitPercent(window)
          return (
            <Progress
              key={window.window}
              value={percent}
              aria-valuetext={`${window.used} of ${window.limit} requests`}
              className={cn(
                percent >= 90
                  ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                  : percent >= 75 &&
                      '[&_[data-slot=progress-indicator]]:bg-warning-foreground',
              )}
            >
              <ProgressLabel>
                {RATE_LIMIT_WINDOW_LABELS[window.window]}
              </ProgressLabel>
              <ProgressValue>
                {() =>
                  `${formatNumber(window.used)} / ${formatNumber(window.limit)}`
                }
              </ProgressValue>
              <p className="order-last w-full text-xs text-muted-foreground">
                {formatNumber(window.remaining)} left · resets{' '}
                {formatDateTime(window.resetAt)}
              </p>
            </Progress>
          )
        })}
      </div>
    </PanelSection>
  )
}
