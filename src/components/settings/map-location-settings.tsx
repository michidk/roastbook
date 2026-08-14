import { Loader2, Search } from 'lucide-react'
import { type SyntheticEvent, useEffect, useState } from 'react'
import { InputField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { DefaultMapLocation } from '@/lib/app-settings'
import { geocodeDefaultMapLocation } from '@/lib/server/geocoding'

type MapLocationSettingsProps = {
  readonly location: DefaultMapLocation | null
  readonly disabled: boolean
  readonly onChange: (location: DefaultMapLocation | null) => void
}

export function MapLocationSettings({
  location,
  disabled,
  onChange,
}: MapLocationSettingsProps) {
  const formatNumber = useNumberFormatter()
  const [query, setQuery] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const coordinateError =
    error === 'Enter a valid latitude and longitude.' ? error : undefined

  useEffect(() => {
    if (!location) {
      setLatitude('')
      setLongitude('')
      setLocationLabel('')
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
        setError('No matching location was found.')
        return
      }
      onChange(result)
    } catch (lookupError) {
      if (!(lookupError instanceof Error)) throw lookupError
      setError('Location lookup is unavailable right now.')
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
      setError('Enter a valid latitude and longitude.')
      return
    }
    setError(null)
    onChange({
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      label:
        locationLabel.trim() ||
        `${formatNumber(parsedLatitude.toFixed(5))} / ${formatNumber(parsedLongitude.toFixed(5))}`,
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={lookupLocation} className="space-y-3">
        <InputField
          id="map-location-query"
          label="Location"
          value={query}
          placeholder="e.g. München"
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
          {isLookingUp ? 'Looking up…' : 'Look up location'}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          id="default-map-latitude"
          label="Latitude"
          type="number"
          inputMode="decimal"
          step="0.001"
          showStepper={false}
          min={-90}
          max={90}
          value={latitude}
          disabled={disabled || isLookingUp}
          error={coordinateError}
          onChange={(value) => {
            setLatitude(value)
            setLocationLabel('')
            setError(null)
          }}
        />
        <InputField
          id="default-map-longitude"
          label="Longitude"
          type="number"
          inputMode="decimal"
          step="0.001"
          showStepper={false}
          min={-180}
          max={180}
          value={longitude}
          disabled={disabled || isLookingUp}
          error={coordinateError}
          onChange={(value) => {
            setLongitude(value)
            setLocationLabel('')
            setError(null)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={disabled || isLookingUp || !latitude || !longitude}
          onClick={saveCoordinates}
        >
          Use coordinates
        </Button>
        {location && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled || isLookingUp}
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
            : 'No custom default set. The map opens around your saved cafés.')}
      </p>
    </div>
  )
}
