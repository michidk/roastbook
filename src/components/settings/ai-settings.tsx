import { Bot, Bug } from 'lucide-react'
import { useState } from 'react'
import { PanelSection } from '@/components/section-layout'
import { AiRequestLogDialog } from '@/components/settings/ai-request-log-dialog'
import { Button } from '@/components/ui/button'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { AiRequestStats } from '@/lib/server/ai-request-logs'

function UsageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  )
}

function formatUsd(value: string, formatNumber: (value: string) => string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '$0.00'
  return `$${formatNumber(amount.toFixed(amount < 0.01 ? 4 : 2))}`
}

export function AiSettings({
  stats,
  providedAvailable,
}: {
  stats: AiRequestStats
  providedAvailable: boolean
}) {
  const [requestLogOpen, setRequestLogOpen] = useState(false)
  const formatNumber = useNumberFormatter()

  return (
    <>
      <PanelSection
        title={
          providedAvailable ? 'BYOAI usage and costs' : 'AI usage and costs'
        }
        description={
          providedAvailable
            ? 'Lifetime usage billed to your own provider. Free provided-AI requests are excluded.'
            : 'Lifetime usage billed to your own provider.'
        }
        action={<Bot className="h-5 w-5 text-link" aria-hidden="true" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <UsageMetric
            label="Requests"
            value={formatNumber(stats.requestCount)}
          />
          <UsageMetric
            label="Input tokens"
            value={formatNumber(stats.promptTokens)}
          />
          <UsageMetric
            label="Output tokens"
            value={formatNumber(stats.completionTokens)}
          />
          <UsageMetric
            label="Total tokens"
            value={formatNumber(stats.totalTokens)}
          />
          <UsageMetric
            label="Estimated cost"
            value={formatUsd(stats.estimatedCostUsd, formatNumber)}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Prompt and response bodies are redacted by default. Cost uses
            provider totals or known standard token rates; tool fees are
            excluded.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRequestLogOpen(true)}
          >
            <Bug aria-hidden="true" />
            Open request log
          </Button>
        </div>
      </PanelSection>
      <AiRequestLogDialog
        open={requestLogOpen}
        onOpenChange={setRequestLogOpen}
      />
    </>
  )
}
