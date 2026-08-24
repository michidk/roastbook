import { Loader2, MonitorCog, Wallpaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SelectField } from '@/components/form/form-field'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import {
  isThemePreference,
  THEME_OPTIONS,
  usePreferencesStore,
} from '@/lib/preferences-store'
import { updateBackgroundTextureEnabled } from '@/lib/server/settings'

/** The theme and page background settings sections. */
export function AppearanceSettings({
  onSaved,
}: {
  readonly onSaved: () => void
}) {
  const savedSettings = useAppSettings()
  const demoMode = savedSettings.demoMode
  const savedBackgroundTextureEnabled = savedSettings.backgroundTextureEnabled
  const [backgroundTextureEnabled, setBackgroundTextureEnabled] = useState(
    savedBackgroundTextureEnabled,
  )
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydratedPreferences = usePreferencesStore(
    (state) => state.hasHydrated,
  )
  const setTheme = usePreferencesStore((state) => state.setTheme)

  useEffect(
    () => setBackgroundTextureEnabled(savedBackgroundTextureEnabled),
    [savedBackgroundTextureEnabled],
  )

  const backgroundTextureMutation = useSettingMutation({
    savedValue: savedBackgroundTextureEnabled,
    applyValue: setBackgroundTextureEnabled,
    mutate: (enabled) => updateBackgroundTextureEnabled({ data: enabled }),
    selectValue: (updated) => updated.backgroundTextureEnabled,
    onSaved,
    errorMessage: 'Could not save the page background setting',
  })

  return (
    <>
      <SettingsPanelSection
        title="Theme"
        description="Use a fixed theme or follow your browser and operating system. This preference is stored only in this browser."
        action={<MonitorCog className="size-5 text-link" />}
      >
        <SelectField
          id="theme"
          label="Theme"
          value={theme}
          disabled={!hasHydratedPreferences}
          options={THEME_OPTIONS}
          onChange={(value) => {
            if (isThemePreference(value)) setTheme(value)
          }}
        />
      </SettingsPanelSection>

      <SettingsPanelSection
        title="Page background"
        description="Control the shared page canvas for this Roastbook installation."
        action={
          backgroundTextureMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Wallpaper className="size-5 text-link" />
          )
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="background-texture">Background texture</Label>
            <p className="text-sm text-muted-foreground">
              Show paper grain and faint coffee-ring marks for everyone.
            </p>
          </div>
          <Switch
            id="background-texture"
            checked={backgroundTextureEnabled}
            disabled={demoMode || backgroundTextureMutation.isSaving}
            onCheckedChange={(checked) =>
              void backgroundTextureMutation.save(checked)
            }
          />
        </div>
      </SettingsPanelSection>
    </>
  )
}
