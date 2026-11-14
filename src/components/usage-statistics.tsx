import { Button } from '@roastbook/ui/button'
import { Checkbox } from '@roastbook/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@roastbook/ui/dialog'
import { Label } from '@roastbook/ui/label'
import { Switch } from '@roastbook/ui/switch'
import { useEffect, useState } from 'react'
import { PanelSection } from '@/components/section-layout'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  getUsagePreference,
  sendBrowserUsageEvent,
  setUsagePreference,
} from '@/lib/server/usage-statistics'
import { browserUsageEvent } from '@/modules/usage-statistics/browser'
import { browserUsageEventSchema } from '@/modules/usage-statistics/contract'

const preferenceChanged = 'roastbook-usage-preference-changed'
const description =
  'Share counts of journal activity, AI key setup and recommendations, integration key management, account export and deletion actions, and app installation with Roastbook’s maintainers through PostHog in the EU. Includes a random browser identifier, application version and deployment type. No journal content, email addresses, private URLs or recordings are sent.'

function useUsagePreference() {
  const [state, setState] = useState<Awaited<
    ReturnType<typeof getUsagePreference>
  > | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (DEMO_MODE) return
    let active = true
    const refresh = () => {
      void getUsagePreference()
        .then((value) => {
          if (active) setState(value)
        })
        .catch(() => {})
    }
    refresh()
    window.addEventListener(preferenceChanged, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener(preferenceChanged, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  async function save(granted: boolean) {
    setBusy(true)
    setError(null)
    try {
      await setUsagePreference({ data: granted })
      const saved = await getUsagePreference()
      setState(saved)
      if (saved.preference !== (granted ? 'granted' : 'denied')) {
        setError(
          'Your browser could not save this choice. Allow first-party cookies and try again. Statistics remain off unless consent is saved.',
        )
        return
      }
      window.dispatchEvent(new Event(preferenceChanged))
    } catch {
      setError(
        'Could not save your choice. Check your connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return { state, busy, error, save }
}

export function UsageConsentPrompt() {
  const { state, busy, error, save } = useUsagePreference()
  useEffect(() => {
    if (!state?.available || state.blocked || state.preference !== 'granted')
      return
    const receive = (event: Event) => {
      if (!(event instanceof CustomEvent) || !navigator.onLine) return
      const parsed = browserUsageEventSchema.safeParse(event.detail)
      if (parsed.success)
        void sendBrowserUsageEvent({ data: parsed.data }).catch(() => {})
    }
    window.addEventListener(browserUsageEvent, receive)
    return () => window.removeEventListener(browserUsageEvent, receive)
  }, [state])
  const [checked, setChecked] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  if (
    !state?.available ||
    state.blocked ||
    state.preference !== 'pending' ||
    dismissed
  )
    return null
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setDismissed(true)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help improve Roastbook</DialogTitle>
          <DialogDescription>
            Sharing usage statistics is optional. Roastbook works the same
            either way.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex items-center gap-3">
            <Checkbox
              id="usage-consent"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              disabled={busy}
            />
            <Label htmlFor="usage-consent">
              Share usage statistics from this browser
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Change this choice at any time in Settings → General. Nothing is
            sent before you agree.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive-text">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void save(false)}
          >
            No thanks
          </Button>
          <Button disabled={busy} onClick={() => void save(checked)}>
            Save preference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UsageStatisticsSettings() {
  const { state, busy, error, save } = useUsagePreference()
  if (!state?.available) return null
  return (
    <PanelSection
      title="Usage statistics"
      description="An optional choice for this browser, including shared journals."
    >
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="usage-statistics">Share usage statistics</Label>
        <Switch
          id="usage-statistics"
          checked={!state.blocked && state.preference === 'granted'}
          onCheckedChange={(checked) => void save(checked)}
          disabled={busy || state.blocked}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {state.blocked
          ? 'Your browser’s Do Not Track setting keeps statistics off.'
          : 'Turning this off removes this browser’s analytics identifier. Previously sent events are not deleted. Offline activity is never backfilled.'}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
    </PanelSection>
  )
}
