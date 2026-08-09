import { createFileRoute } from "@tanstack/react-router"
import { CircleDollarSign, MapPinned, MonitorCog } from "lucide-react"
import { CurrencyField, SelectField } from "@/components/form/form-field"
import { FormPageHeader, FormSection } from "@/components/form/form-shell"
import { MapLocationSettings } from "@/components/settings/map-location-settings"
import {
  THEME_OPTIONS,
  isCurrency,
  isThemePreference,
  useSettingsStore,
} from "@/lib/settings-store"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const defaultCurrency = useSettingsStore((state) => state.defaultCurrency)
  const theme = useSettingsStore((state) => state.theme)
  const defaultMapLocation = useSettingsStore(
    (state) => state.defaultMapLocation,
  )
  const hasHydrated = useSettingsStore((state) => state.hasHydrated)
  const setDefaultCurrency = useSettingsStore(
    (state) => state.setDefaultCurrency,
  )
  const setTheme = useSettingsStore((state) => state.setTheme)
  const setDefaultMapLocation = useSettingsStore(
    (state) => state.setDefaultMapLocation,
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 md:space-y-8">
      <FormPageHeader
        title="Settings"
        description="Choose defaults for this browser. Changes save automatically."
      />

      <FormSection
        title="Default currency"
        description="Used for beans, gear, and cafe visits."
        action={<CircleDollarSign className="h-5 w-5 text-primary" />}
      >
        <CurrencyField
          id="default-currency"
          label="Currency"
          value={defaultCurrency}
          disabled={!hasHydrated}
          onChange={(value) => {
            if (isCurrency(value)) setDefaultCurrency(value)
          }}
        />
      </FormSection>

      <FormSection
        title="Default map location"
        description="Choose where the café explorer opens. Look up a city or postal code, or enter coordinates directly."
        action={<MapPinned className="h-5 w-5 text-primary" />}
      >
        <MapLocationSettings
          location={defaultMapLocation}
          disabled={!hasHydrated}
          onChange={setDefaultMapLocation}
        />
      </FormSection>

      <FormSection
        title="Appearance"
        description="Use a fixed theme or follow your browser and operating system."
        action={<MonitorCog className="h-5 w-5 text-primary" />}
      >
        <SelectField
          id="theme"
          label="Theme"
          value={theme}
          disabled={!hasHydrated}
          options={THEME_OPTIONS}
          onChange={(value) => {
            if (isThemePreference(value)) setTheme(value)
          }}
        />
      </FormSection>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {hasHydrated
          ? "Preferences are stored only in this browser."
          : "Loading browser preferences…"}
      </p>
    </div>
  )
}
