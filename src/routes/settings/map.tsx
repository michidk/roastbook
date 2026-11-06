import { createFileRoute } from '@tanstack/react-router'
import { Loader2, MapPinned } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PanelPending } from '@/components/route-pending'
import { PanelSection } from '@/components/section-layout'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import { updateDefaultMapLocation } from '@/journal/settings'

export const Route = createFileRoute('/settings/map')({
  pendingComponent: PanelPending,
  component: MapSettingsSection,
})

function MapSettingsSection() {
  const savedSettings = useAppSettings()
  const savedLatitude = savedSettings.defaultMapLocation?.latitude
  const savedLongitude = savedSettings.defaultMapLocation?.longitude
  const savedLabel = savedSettings.defaultMapLocation?.label
  const [mapLocation, setMapLocation] = useState(
    savedSettings.defaultMapLocation,
  )

  useEffect(
    () =>
      setMapLocation(
        savedLatitude !== undefined &&
          savedLongitude !== undefined &&
          savedLabel !== undefined
          ? {
              latitude: savedLatitude,
              longitude: savedLongitude,
              label: savedLabel,
            }
          : null,
      ),
    [savedLatitude, savedLongitude, savedLabel],
  )

  const mapLocationMutation = useSettingMutation({
    savedValue: savedSettings.defaultMapLocation,
    applyValue: setMapLocation,
    mutate: (defaultMapLocation) =>
      updateDefaultMapLocation({ data: defaultMapLocation }),
    selectValue: (updated) => updated.defaultMapLocation,
    errorMessage: 'Could not save the default map location',
  })

  return (
    <PanelSection
      title="Default map location"
      description="Choose where the café explorer opens. Look up a location or enter coordinates directly."
      action={
        mapLocationMutation.isSaving ? (
          <Loader2 className="size-5 animate-spin text-link" />
        ) : (
          <MapPinned className="size-5 text-link" />
        )
      }
    >
      <MapLocationSettings
        location={mapLocation}
        disabled={mapLocationMutation.isSaving}
        onChange={(location) => void mapLocationMutation.save(location)}
      />
    </PanelSection>
  )
}
