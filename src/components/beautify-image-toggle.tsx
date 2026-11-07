import { Label } from '@roastbook/ui/label'
import { Switch } from '@roastbook/ui/switch'
import { useEffect, useId, useState } from 'react'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import { updateBeautifyImages } from '@/journal/settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { checkVisionEnabled } from '@/lib/client/research'

/** Image edits use the same provider key as picture reading. */
export function useBeautifyAvailable() {
  const isOnline = useOnlineStatus()
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (DEMO_MODE || !isOnline) return setAvailable(false)
    let active = true
    void checkVisionEnabled().then((result) => {
      if (active) setAvailable(result.enabled)
    })
    return () => {
      active = false
    }
  }, [isOnline])
  return available
}

export function BeautifyImageToggle({
  disabled = false,
}: {
  readonly disabled?: boolean
}) {
  const settings = useAppSettings()
  const available = useBeautifyAvailable()
  const [enabled, setEnabled] = useState(settings.beautifyImages)
  const id = useId()
  useEffect(
    () => setEnabled(settings.beautifyImages),
    [settings.beautifyImages],
  )
  const mutation = useSettingMutation({
    savedValue: settings.beautifyImages,
    applyValue: setEnabled,
    mutate: (beautifyImages) => updateBeautifyImages({ data: beautifyImages }),
    selectValue: (updated) => updated.beautifyImages,
    errorMessage: 'Could not remember the image setting',
  })
  if (!available) return null
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border/70 px-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id}>Beautify image</Label>
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          AI retouches the primary picture and keeps the original. Provider
          charges apply.
        </p>
      </div>
      <Switch
        id={id}
        checked={enabled}
        disabled={disabled || mutation.isSaving}
        aria-describedby={`${id}-help`}
        onCheckedChange={(checked) => void mutation.save(checked)}
      />
    </div>
  )
}
