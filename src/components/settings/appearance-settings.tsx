import { Label } from '@roastbook/ui/label'
import { Switch } from '@roastbook/ui/switch'
import { useEffect, useState } from 'react'
import { PanelSection } from '@/components/section-layout'
import { ColorModePicker } from '@/components/settings/color-mode-picker'
import { ThemePalettePicker } from '@/components/settings/theme-palette-picker'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import {
  updateBackgroundGrainEnabled,
  updateBackgroundTextureEnabled,
  updateDarkTheme,
  updateLightTheme,
} from '@/journal/settings'
import { usePreferencesStore } from '@/lib/preferences-store'
import { DARK_THEMES, LIGHT_THEMES } from '@/lib/theme'

/** The theme and page background settings sections. */
export function AppearanceSettings() {
  const savedSettings = useAppSettings()
  const savedBackgroundTextureEnabled = savedSettings.backgroundTextureEnabled
  const [backgroundTextureEnabled, setBackgroundTextureEnabled] = useState(
    savedBackgroundTextureEnabled,
  )
  const [backgroundGrainEnabled, setBackgroundGrainEnabled] = useState(
    savedSettings.backgroundGrainEnabled ?? true,
  )
  const [lightTheme, setLightTheme] = useState(
    savedSettings.lightTheme ?? 'light-roast',
  )
  const [darkTheme, setDarkTheme] = useState(
    savedSettings.darkTheme ?? 'dark-roast',
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
    errorMessage: 'Could not save the page background setting',
  })

  useEffect(
    () => setLightTheme(savedSettings.lightTheme ?? 'light-roast'),
    [savedSettings.lightTheme],
  )
  const lightThemeMutation = useSettingMutation({
    savedValue: savedSettings.lightTheme ?? 'light-roast',
    applyValue: setLightTheme,
    mutate: (value) => updateLightTheme({ data: value }),
    selectValue: (updated) => updated.lightTheme,
    errorMessage: 'Could not save the light theme',
  })
  useEffect(
    () => setDarkTheme(savedSettings.darkTheme ?? 'dark-roast'),
    [savedSettings.darkTheme],
  )
  const darkThemeMutation = useSettingMutation({
    savedValue: savedSettings.darkTheme ?? 'dark-roast',
    applyValue: setDarkTheme,
    mutate: (value) => updateDarkTheme({ data: value }),
    selectValue: (updated) => updated.darkTheme,
    errorMessage: 'Could not save the dark theme',
  })
  useEffect(
    () =>
      setBackgroundGrainEnabled(savedSettings.backgroundGrainEnabled ?? true),
    [savedSettings.backgroundGrainEnabled],
  )
  const backgroundGrainEnabledMutation = useSettingMutation({
    savedValue: savedSettings.backgroundGrainEnabled ?? true,
    applyValue: setBackgroundGrainEnabled,
    mutate: (value) => updateBackgroundGrainEnabled({ data: value }),
    selectValue: (updated) => updated.backgroundGrainEnabled,
    errorMessage: 'Could not save the background grain',
  })
  return (
    <PanelSection title="Theme" contentClassName="space-y-7">
      <ColorModePicker
        value={theme}
        disabled={!hasHydratedPreferences}
        onChange={setTheme}
      />
      <div className="space-y-5">
        <div>
          <h3 className="font-display text-base font-bold">Your palettes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {savedSettings.demoMode
              ? 'Saved only in this browser’s temporary demo journal.'
              : 'Saved to your journal across devices.'}
          </p>
        </div>
        <ThemePalettePicker
          mode="light"
          options={LIGHT_THEMES}
          value={lightTheme}
          onChange={(value) => void lightThemeMutation.save(value)}
          disabled={lightThemeMutation.isSaving}
        />
        <ThemePalettePicker
          mode="dark"
          options={DARK_THEMES}
          value={darkTheme}
          onChange={(value) => void darkThemeMutation.save(value)}
          disabled={darkThemeMutation.isSaving}
        />
        <div className="grid gap-5 rounded-xl bg-secondary/40 p-4 sm:grid-cols-2 sm:gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label id="background-stains-label" htmlFor="background-texture">
                Coffee stains
              </Label>
              <p className="text-sm text-muted-foreground">
                Coffee-ring marks in all themes.
              </p>
            </div>
            <Switch
              id="background-texture"
              aria-labelledby="background-stains-label"
              checked={backgroundTextureEnabled}
              disabled={backgroundTextureMutation.isSaving}
              onCheckedChange={(checked) =>
                void backgroundTextureMutation.save(checked)
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label id="background-grain-label" htmlFor="background-grain">
                Background grain
              </Label>
              <p className="text-sm text-muted-foreground">
                A paper texture in all themes.
              </p>
            </div>
            <Switch
              id="background-grain"
              aria-labelledby="background-grain-label"
              checked={backgroundGrainEnabled}
              disabled={backgroundGrainEnabledMutation.isSaving}
              onCheckedChange={(value) =>
                void backgroundGrainEnabledMutation.save(value)
              }
            />
          </div>
        </div>
      </div>
    </PanelSection>
  )
}
