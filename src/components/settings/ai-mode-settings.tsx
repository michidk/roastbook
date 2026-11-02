import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  type getAiProviderSettings,
  setAiProviderMode,
} from '@/lib/server/ai-provider-settings'
import type { AiRequestStats } from '@/lib/server/ai-request-logs'

type Allowance = Awaited<ReturnType<typeof getAiProviderSettings>>['allowance']
export function AiModeSettings({
  allowance,
  stats,
}: {
  allowance: Allowance
  stats: AiRequestStats
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const formatDate = useDateTimeFormatter()
  const number = useNumberFormatter()
  async function changeMode(byo: boolean) {
    setBusy(true)
    try {
      await setAiProviderMode({ data: byo ? 'byo' : 'provided' })
      await router.invalidate()
      toast.success(byo ? 'BYOAI selected' : 'Provided AI selected')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not switch AI provider',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!allowance.providedAvailable) return null
  return (
    <SettingsPanelSection
      title="AI provider"
      description="Use your free weekly allowance or connect your own provider."
    >
      <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="space-y-1">
          <Label htmlFor="byoai">BYOAI</Label>
          <p id="byoai-help" className="text-sm text-muted-foreground">
            Bring your own AI endpoint and key. Usage is billed by your
            provider.
          </p>
        </div>
        <Switch
          id="byoai"
          aria-describedby="byoai-help"
          checked={allowance.mode === 'byo'}
          disabled={busy}
          onCheckedChange={(checked) => void changeMode(checked)}
        />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-bold">Free AI allowance</h3>
          <p className="font-semibold tabular-nums">
            {number(allowance.used)} / {number(allowance.limit)} requests this
            week
          </p>
        </div>
        <Progress
          className="h-2 w-full accent-primary"
          aria-label="Weekly free AI requests used"
          value={Math.min(allowance.used, allowance.limit)}
          max={Math.max(1, allowance.limit)}
        />
        <p className="text-sm text-muted-foreground">
          {number(Math.max(0, allowance.limit - allowance.used))} requests
          remaining. Resets every Monday at 00:00 UTC. Next reset:{' '}
          {formatDate(allowance.resetAt)}.
        </p>
        <p className="text-sm text-muted-foreground">
          Each submitted AI operation uses one request, including failures and
          cancellations. BYOAI does not use this allowance. Your selected
          journal data and images are sent to the selected provider.
        </p>
        {allowance.mode === 'provided' && allowance.used >= allowance.limit ? (
          <p role="status" className="text-sm font-medium">
            You have used this week's allowance. Wait for the reset or enable
            BYOAI.
          </p>
        ) : null}
      </div>
      <div>
        <h3 className="mb-3 font-display font-bold">
          Provided AI · lifetime usage
        </h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Free requests', value: stats.requestCount },
            { label: 'Input tokens', value: stats.promptTokens },
            { label: 'Output tokens', value: stats.completionTokens },
            { label: 'Total tokens', value: stats.totalTokens },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-muted/70 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {number(value)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Provided AI is free to you and excluded from your BYOAI cost estimate.
        </p>
      </div>
    </SettingsPanelSection>
  )
}
