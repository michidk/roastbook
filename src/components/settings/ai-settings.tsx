import { Button } from '@roastbook/ui/button'
import { Bot, Bug } from 'lucide-react'
import { useState } from 'react'
import { PanelSection } from '@/components/section-layout'
import { AiRequestLogDialog } from '@/components/settings/ai-request-log-dialog'
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

export function AiSettings({ stats }: { stats: AiRequestStats }) {
  const [requestLogOpen, setRequestLogOpen] = useState(false)
  const formatNumber = useNumberFormatter()

  return (
    <>
      <PanelSection
        title="AI usage"
        description="Lifetime token usage with your provider."
        action={<Bot className="h-5 w-5 text-link" aria-hidden="true" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Prompt and response bodies are redacted by default. Your provider's
            dashboard shows what these tokens cost.
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
