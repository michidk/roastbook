import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Bot,
  HardDrive,
  Info,
  Loader2,
  Map as MapIcon,
  MapPinned,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Tags,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { AboutSettings } from '@/components/settings/about-settings'
import { AiSettings } from '@/components/settings/ai-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { GeneralSettings } from '@/components/settings/general-settings'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import {
  SettingsPanelSection,
  type SettingsSection,
  SettingsShell,
} from '@/components/settings/settings-shell'
import { StorageSettings } from '@/components/settings/storage-settings'
import { TasteProfileSettings } from '@/components/settings/taste-profile-settings'
import { TasteTagSettings } from '@/components/settings/taste-tag-settings'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import { getAiRequestStats } from '@/lib/server/ai-request-logs'
import { getInternalStats } from '@/lib/server/internal-stats'
import {
  updateDefaultMapLocation,
  updateTasteProfileFields,
} from '@/lib/server/settings'
import { getTasteTags } from '@/lib/server/taste-tags'
import {
  enabledTasteProfileFields,
  type TasteProfileConfig,
  type TasteProfileField,
  type TasteProfileMode,
  withTasteProfileMode,
} from '@/lib/taste-profile'

export const Route = createFileRoute('/settings')({
  loader: async () => {
    const [aiStats, internalStats, tasteTags] = await Promise.all([
      getAiRequestStats(),
      getInternalStats(),
      getTasteTags(),
    ])
    return { aiStats, internalStats, tasteTags }
  },
  component: SettingsPage,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'taste-profile', label: 'Taste profile', icon: Sparkles },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'about', label: 'About', icon: Info },
] as const satisfies readonly SettingsSection[]

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']

function SettingsPage() {
  const { aiStats, internalStats, tasteTags } = Route.useLoaderData()
  const savedSettings = useAppSettings()
  const router = useRouter()
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('general')
  const savedTasteProfile = savedSettings.tasteProfile
  const savedMapLatitude = savedSettings.defaultMapLocation?.latitude
  const savedMapLongitude = savedSettings.defaultMapLocation?.longitude
  const savedMapLabel = savedSettings.defaultMapLocation?.label
  const [tasteProfile, setTasteProfile] = useState(savedTasteProfile)
  const [mapLocation, setMapLocation] = useState(
    savedSettings.defaultMapLocation,
  )

  useEffect(() => setTasteProfile(savedTasteProfile), [savedTasteProfile])

  useEffect(
    () =>
      setMapLocation(
        savedMapLatitude !== undefined &&
          savedMapLongitude !== undefined &&
          savedMapLabel !== undefined
          ? {
              latitude: savedMapLatitude,
              longitude: savedMapLongitude,
              label: savedMapLabel,
            }
          : null,
      ),
    [savedMapLatitude, savedMapLongitude, savedMapLabel],
  )

  const onSaved = () => void router.invalidate()
  const tasteProfileMutation = useSettingMutation<TasteProfileConfig>({
    savedValue: savedTasteProfile,
    applyValue: setTasteProfile,
    mutate: (nextTasteProfile) =>
      updateTasteProfileFields({
        data: enabledTasteProfileFields(nextTasteProfile),
      }),
    selectValue: (updated) => updated.tasteProfile,
    onSaved,
    errorMessage: 'Could not save the taste profile fields',
  })
  const mapLocationMutation = useSettingMutation({
    savedValue: savedSettings.defaultMapLocation,
    applyValue: setMapLocation,
    mutate: (defaultMapLocation) =>
      updateDefaultMapLocation({ data: defaultMapLocation }),
    selectValue: (updated) => updated.defaultMapLocation,
    onSaved,
    errorMessage: 'Could not save the default map location',
  })

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Configure your Roastbook experience and installation"
      />

      <SettingsShell
        sections={SETTINGS_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {activeSection === 'general' ? (
          <GeneralSettings onSaved={onSaved} />
        ) : null}

        {activeSection === 'appearance' ? (
          <AppearanceSettings onSaved={onSaved} />
        ) : null}

        {activeSection === 'map' ? (
          <SettingsPanelSection
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
          </SettingsPanelSection>
        ) : null}

        {activeSection === 'taste-profile' ? (
          <>
            <SettingsPanelSection
              title="Taste profile"
              description="Choose which tasting inputs Roastbook captures for brews and café visits. A disabled input is hidden everywhere, including on entries that already recorded it."
              action={
                tasteProfileMutation.isSaving ? (
                  <Loader2 className="size-5 animate-spin text-link" />
                ) : (
                  <Sparkles className="size-5 text-link" aria-hidden="true" />
                )
              }
            >
              <TasteProfileSettings
                config={tasteProfile}
                disabled={tasteProfileMutation.isSaving}
                onToggle={(field: TasteProfileField, enabled) =>
                  void tasteProfileMutation.save({
                    ...tasteProfile,
                    [field]: enabled,
                  })
                }
                onModeChange={(mode: TasteProfileMode) =>
                  void tasteProfileMutation.save(
                    withTasteProfileMode(tasteProfile, mode),
                  )
                }
              />
            </SettingsPanelSection>

            {tasteProfile.flavorTags ? (
              <SettingsPanelSection
                title="Taste tags"
                description="The tags offered when rating brews and café visits. Removing a tag also removes it from existing entries."
                action={
                  <Tags className="size-5 text-link" aria-hidden="true" />
                }
              >
                <TasteTagSettings
                  tags={tasteTags}
                  onChanged={() => router.invalidate()}
                />
              </SettingsPanelSection>
            ) : null}
          </>
        ) : null}

        {activeSection === 'ai' ? <AiSettings stats={aiStats} /> : null}

        {activeSection === 'storage' ? (
          <StorageSettings storage={internalStats.storage} />
        ) : null}

        {activeSection === 'about' ? <AboutSettings /> : null}
      </SettingsShell>
    </Page>
  )
}
