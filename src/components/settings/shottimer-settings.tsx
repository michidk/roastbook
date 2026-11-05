import { Link } from '@tanstack/react-router'
import { KeyRound, Loader2, Timer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PanelSection } from '@/components/section-layout'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { updateShottimerEnabled } from '@/lib/server/shottimer'
import type { ShottimerSettings as ShottimerSettingsState } from '@/lib/shottimer'

/**
 * Enables the shottimer device API. The device authenticates with an API key
 * limited to the shottimer scope.
 */
export function ShottimerSettings({
  settings,
  onSaved,
}: {
  readonly settings: ShottimerSettingsState
  readonly onSaved: () => void
}) {
  const { demoMode } = useAppSettings()
  const isOnline = useOnlineStatus()
  const [enabled, setEnabled] = useState(settings.enabled)
  const [isSaving, setIsSaving] = useState(false)

  const saveEnabled = async (nextEnabled: boolean) => {
    if (!isOnline) {
      toast.error('Shottimer settings need a connection to save changes')
      return
    }
    setEnabled(nextEnabled)
    setIsSaving(true)
    try {
      setEnabled((await updateShottimerEnabled({ data: nextEnabled })).enabled)
      onSaved()
    } catch {
      setEnabled(settings.enabled)
      toast.error('Could not save the shottimer setting')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PanelSection
        title="Shottimer"
        description="Receive brew times from a Wi-Fi shottimer. Open new brew pages offer each received time and share their target time with the device."
        action={
          isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Timer className="size-5 text-link" />
          )
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="shottimer-enabled">Shottimer integration</Label>
            <p className="text-sm text-muted-foreground">
              Accept requests to <code>/api/shottimer/*</code> from API keys
              with shottimer access.
            </p>
          </div>
          <Switch
            id="shottimer-enabled"
            checked={enabled}
            disabled={demoMode || !isOnline || isSaving}
            onCheckedChange={(checked) => void saveEnabled(checked)}
          />
        </div>
      </PanelSection>

      <PanelSection
        title="Device key"
        description="Create an API key that may only report brew times and read the target time, then enter it in your shottimer configuration. Revoke it in Settings → API to disconnect the device."
        action={<KeyRound className="size-5 text-link" />}
      >
        {demoMode ? (
          <p className="text-sm text-muted-foreground">
            Device keys are unavailable in the demo.
          </p>
        ) : (
          <Link
            to="/settings/api"
            search={{
              create: true,
              name: 'Shottimer',
              scopes: 'shottimer:write',
              expires: 'never',
            }}
            className={buttonVariants({ variant: 'outline' })}
          >
            <KeyRound aria-hidden="true" />
            Create a shottimer key
          </Link>
        )}
      </PanelSection>
    </>
  )
}
