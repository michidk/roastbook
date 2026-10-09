import { Copy, KeyRound, Loader2, Timer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAppSettings } from '@/hooks/use-app-settings'
import {
  createShottimerToken,
  updateShottimerEnabled,
} from '@/lib/server/shottimer'
import type { ShottimerSettings as ShottimerSettingsState } from '@/lib/shottimer'

/** Enables the shottimer device API and issues its access token. */
export function ShottimerSettings({
  settings,
  onSaved,
}: {
  readonly settings: ShottimerSettingsState
  readonly onSaved: () => void
}) {
  const { demoMode } = useAppSettings()
  const [enabled, setEnabled] = useState(settings.enabled)
  const [isSaving, setIsSaving] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isCreatingToken, setIsCreatingToken] = useState(false)

  const saveEnabled = async (nextEnabled: boolean) => {
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

  const createToken = async () => {
    setIsCreatingToken(true)
    try {
      setToken(await createShottimerToken())
      onSaved()
    } catch {
      toast.error('Could not create a device token')
    } finally {
      setIsCreatingToken(false)
    }
  }

  const copyToken = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Token copied')
    } catch {
      toast.error('Could not copy the token. Select and copy it manually.')
    }
  }

  return (
    <>
      <SettingsPanelSection
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
              Accept requests to <code>/api/shottimer/*</code> that carry the
              device token.
            </p>
          </div>
          <Switch
            id="shottimer-enabled"
            checked={enabled}
            disabled={demoMode || isSaving}
            onCheckedChange={(checked) => void saveEnabled(checked)}
          />
        </div>
      </SettingsPanelSection>

      <SettingsPanelSection
        title="Device token"
        description={
          settings.hasToken
            ? 'A token is configured. Creating a new one disconnects devices that use the old token.'
            : 'Create a token and enter it in the shottimer configuration.'
        }
        action={<KeyRound className="size-5 text-link" />}
      >
        <div className="space-y-4">
          {token ? (
            <div className="space-y-2">
              <Label htmlFor="shottimer-token">New device token</Label>
              <div className="flex gap-2">
                <Input
                  id="shottimer-token"
                  readOnly
                  value={token}
                  className="font-mono"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy token"
                  onClick={() => void copyToken()}
                >
                  <Copy aria-hidden="true" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This token is shown only once.
              </p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={demoMode || isCreatingToken}
            onClick={() => void createToken()}
          >
            {isCreatingToken ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {settings.hasToken ? 'Replace token' : 'Create token'}
          </Button>
        </div>
      </SettingsPanelSection>
    </>
  )
}
