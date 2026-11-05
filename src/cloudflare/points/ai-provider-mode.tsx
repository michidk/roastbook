import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getAiAllowance, setAiProviderMode } from '@/lib/server/ai-allowance'

export function useAiProviderMode() {
  const router = useRouter()
  const [allowance, setAllowance] = useState<
    Awaited<ReturnType<typeof getAiAllowance>>
  >()
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(
    () =>
      getAiAllowance()
        .then(setAllowance)
        .catch(() => undefined),
    [],
  )
  useEffect(() => {
    void refresh()
  }, [refresh])
  const usesByo = !allowance?.providedAvailable || allowance.mode === 'byo'
  async function change(byo: boolean) {
    if (busy) return
    setBusy(true)
    try {
      await setAiProviderMode({ data: byo ? 'byo' : 'provided' })
      await refresh()
      await router.invalidate()
      toast.success(byo ? 'BYOAI selected' : 'Included AI selected')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not switch AI provider',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!allowance?.providedAvailable) return { usesByo: true, control: null }
  return {
    usesByo,
    description:
      'Choose Included to use your free allowance, or BYOAI to use your own endpoint and key.',
    control: (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
        <div className="space-y-1">
          <Label id="ai-byo-mode-label" htmlFor="ai-byo-mode">
            Use BYOAI
          </Label>
          <p id="ai-provider-mode-help" className="text-sm text-muted-foreground">
            {usesByo
              ? 'AI requests use your own provider and billing.'
              : 'AI requests use the included provider and your weekly free allowance.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Included</span>
          <Switch
            id="ai-byo-mode"
            aria-labelledby="ai-byo-mode-label"
            className="after:-inset-y-3.5"
            checked={usesByo}
            disabled={busy}
            aria-describedby="ai-provider-mode-help"
            onCheckedChange={(checked) => void change(checked)}
          />
          <span className="text-sm font-medium">BYOAI</span>
        </div>
      </div>
    ),
  }
}
