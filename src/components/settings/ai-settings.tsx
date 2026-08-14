import { Bot, Bug } from 'lucide-react'
import { useState } from 'react'
import { FormSection } from '@/components/form/form-shell'
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

export function AiSettings({ stats }: { stats: AiRequestStats }) {
  const [requestLogOpen, setRequestLogOpen] = useState(false)
  const formatNumber = useNumberFormatter()

  return (
    <>
      <FormSection
        title="AI"
        description="Review lifetime token usage and inspect raw extraction and research traffic."
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
            Includes full prompts, images, provider events, and unparsed
            responses. Cost uses provider totals or known standard token rates;
            tool fees are excluded.
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
      </FormSection>
      <AiRequestLogDialog
        open={requestLogOpen}
        onOpenChange={setRequestLogOpen}
      />
    </>
  )
}
