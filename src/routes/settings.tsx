import { useEffect, useState, type SyntheticEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { CircleDollarSign, Loader2, MapPinned, MonitorCog, Search } from "lucide-react"
import {
  CurrencyField,
  InputField,
  SelectField,
} from "@/components/form/form-field"
import { FormPageHeader, FormSection } from "@/components/form/form-shell"
import { Button } from "@/components/ui/button"
import { geocodeDefaultMapLocation } from "@/lib/server/geocoding"
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

function MapLocationSettings({
  location,
  disabled,
  onChange,
}: {
  readonly location: {
    readonly latitude: number
    readonly longitude: number
    readonly label: string
  } | null
  readonly disabled: boolean
  readonly onChange: (location: {
    readonly latitude: number
    readonly longitude: number
    readonly label: string
  } | null) => void
}) {
  const [query, setQuery] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [locationLabel, setLocationLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  useEffect(() => {
    if (!location) {
      setLatitude("")
      setLongitude("")
      setLocationLabel("")
      return
    }
    setLatitude(String(location.latitude))
    setLongitude(String(location.longitude))
    setLocationLabel(location.label)
  }, [location])

  const lookupLocation = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (query.trim().length < 3 || isLookingUp) return
    setIsLookingUp(true)
    setError(null)
    try {
      const result = await geocodeDefaultMapLocation({
        data: { query: query.trim() },
      })
      if (!result) {
        setError("No matching city or postal code was found.")
        return
      }
      onChange(result)
    } catch (lookupError) {
      if (!(lookupError instanceof Error)) throw lookupError
      setError("Location lookup is unavailable right now.")
    } finally {
      setIsLookingUp(false)
    }
  }

  const saveCoordinates = () => {
    const parsedLatitude = Number(latitude)
    const parsedLongitude = Number(longitude)
    if (
      !Number.isFinite(parsedLatitude) ||
      Math.abs(parsedLatitude) > 90 ||
      !Number.isFinite(parsedLongitude) ||
      Math.abs(parsedLongitude) > 180
    ) {
      setError("Enter a valid latitude and longitude.")
      return
    }
    setError(null)
    onChange({
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      label:
        locationLabel.trim() ||
        `${parsedLatitude.toFixed(5)}, ${parsedLongitude.toFixed(5)}`,
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={lookupLocation} className="space-y-3">
        <InputField
          id="map-location-query"
          label="City or postal code"
          value={query}
          placeholder="e.g. München or 80331"
          disabled={disabled || isLookingUp}
          onChange={setQuery}
        />
        <Button
          type="submit"
          variant="secondary"
          className="min-h-11 w-full sm:w-auto"
          disabled={disabled || isLookingUp || query.trim().length < 3}
          aria-busy={isLookingUp}
        >
          {isLookingUp ? <Loader2 className="animate-spin" /> : <Search />}
          {isLookingUp ? "Looking up…" : "Look up location"}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="default-map-latitude"
          label="Latitude"
          type="number"
          inputMode="decimal"
          step="any"
          value={latitude}
          disabled={disabled}
          onChange={(value) => {
            setLatitude(value)
            setLocationLabel("")
          }}
        />
        <InputField
          id="default-map-longitude"
          label="Longitude"
          type="number"
          inputMode="decimal"
          step="any"
          value={longitude}
          disabled={disabled}
          onChange={(value) => {
            setLongitude(value)
            setLocationLabel("")
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={disabled || !latitude || !longitude}
          onClick={saveCoordinates}
        >
          Use coordinates
        </Button>
        {location && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Clear default
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {error ??
          (location
            ? `Current default: ${location.label}`
            : "No default set. The map opens at your favorite or first saved café.")}
      </p>
    </div>
  )
}
