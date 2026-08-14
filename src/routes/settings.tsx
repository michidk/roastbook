import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Calculator,
  CalendarDays,
  CircleDollarSign,
  Database,
  Globe2,
  Laptop,
  Loader2,
  MapPinned,
  MonitorCog,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CurrencyField,
  InputField,
  SelectField,
} from '@/components/form/form-field'
import { FormPageHeader, FormSection } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { AiSettings } from '@/components/settings/ai-settings'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import {
  type AppSettings,
  DATE_FORMAT_OPTIONS,
  isCurrency,
  isDateFormat,
  isNumberFormat,
  isTimeZone,
  NUMBER_FORMAT_OPTIONS,
} from '@/lib/app-settings'
import {
  isThemePreference,
  THEME_OPTIONS,
  usePreferencesStore,
} from '@/lib/preferences-store'
import { getAiRequestStats } from '@/lib/server/ai-request-logs'
import {
  updateDateFormat,
  updateDefaultCurrency,
  updateDefaultMapLocation,
  updateNumberFormat,
  updateTimeZone,
} from '@/lib/server/settings'

export const Route = createFileRoute('/settings')({
  loader: () => getAiRequestStats(),
  component: SettingsPage,
})

function useSettingMutation<Value>({
  savedValue,
  applyValue,
  mutate,
  selectValue,
  onSaved,
  errorMessage,
  successMessage,
}: {
  readonly savedValue: Value
  readonly applyValue: (value: Value) => void
  readonly mutate: (value: Value) => Promise<AppSettings>
  readonly selectValue: (settings: AppSettings) => Value
  readonly onSaved: () => void
  readonly errorMessage: string
  readonly successMessage?: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  const save = async (nextValue: Value) => {
    if (isSaving) return
    applyValue(nextValue)
    setIsSaving(true)
    try {
      const updated = await mutate(nextValue)
      applyValue(selectValue(updated))
      onSaved()
      if (successMessage) toast.success(successMessage)
    } catch {
      applyValue(savedValue)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return { isSaving, save }
}

function SettingsPage() {
  const aiStats = Route.useLoaderData()
  const savedSettings = useAppSettings()
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>(savedSettings)
  const savedDefaultCurrency = savedSettings.defaultCurrency
  const savedDateFormat = savedSettings.dateFormat
  const savedNumberFormat = savedSettings.numberFormat
  const savedMapLatitude = savedSettings.defaultMapLocation?.latitude
  const savedMapLongitude = savedSettings.defaultMapLocation?.longitude
  const savedMapLabel = savedSettings.defaultMapLocation?.label
  const savedTimeZone = savedSettings.timeZone
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydratedPreferences = usePreferencesStore(
    (state) => state.hasHydrated,
  )
  const setTheme = usePreferencesStore((state) => state.setTheme)

  useEffect(
    () =>
      setSettings({
        defaultCurrency: savedDefaultCurrency,
        dateFormat: savedDateFormat,
        numberFormat: savedNumberFormat,
        timeZone: savedTimeZone,
        defaultMapLocation:
          savedMapLatitude !== undefined &&
          savedMapLongitude !== undefined &&
          savedMapLabel !== undefined
            ? {
                latitude: savedMapLatitude,
                longitude: savedMapLongitude,
                label: savedMapLabel,
              }
            : null,
      }),
    [
      savedDefaultCurrency,
      savedDateFormat,
      savedNumberFormat,
      savedMapLatitude,
      savedMapLongitude,
      savedMapLabel,
      savedTimeZone,
    ],
  )

  const onSaved = () => void router.invalidate()
  const currencyMutation = useSettingMutation({
    savedValue: savedDefaultCurrency,
    applyValue: (defaultCurrency) =>
      setSettings((current) => ({ ...current, defaultCurrency })),
    mutate: (defaultCurrency) =>
      updateDefaultCurrency({ data: defaultCurrency }),
    selectValue: (updated) => updated.defaultCurrency,
    onSaved,
    errorMessage: 'Could not save the default currency',
  })
  const numberFormatMutation = useSettingMutation({
    savedValue: savedNumberFormat,
    applyValue: (numberFormat) =>
      setSettings((current) => ({ ...current, numberFormat })),
    mutate: (numberFormat) => updateNumberFormat({ data: numberFormat }),
    selectValue: (updated) => updated.numberFormat,
    onSaved,
    errorMessage: 'Could not save the number format',
  })
  const dateFormatMutation = useSettingMutation({
    savedValue: savedDateFormat,
    applyValue: (dateFormat) =>
      setSettings((current) => ({ ...current, dateFormat })),
    mutate: (dateFormat) => updateDateFormat({ data: dateFormat }),
    selectValue: (updated) => updated.dateFormat,
    onSaved,
    errorMessage: 'Could not save the date format',
  })
  const timeZoneMutation = useSettingMutation({
    savedValue: savedTimeZone,
    applyValue: (timeZone) =>
      setSettings((current) => ({ ...current, timeZone })),
    mutate: (timeZone) => updateTimeZone({ data: timeZone }),
    selectValue: (updated) => updated.timeZone,
    onSaved,
    errorMessage: 'Could not save the time zone',
    successMessage: 'Time zone saved',
  })
  const mapLocationMutation = useSettingMutation({
    savedValue: savedSettings.defaultMapLocation,
    applyValue: (defaultMapLocation) =>
      setSettings((current) => ({ ...current, defaultMapLocation })),
    mutate: (defaultMapLocation) =>
      updateDefaultMapLocation({ data: defaultMapLocation }),
    selectValue: (updated) => updated.defaultMapLocation,
    onSaved,
    errorMessage: 'Could not save the default map location',
  })

  return (
    <Page width="form">
      <FormPageHeader
        title="Settings"
        description="Manage shared Roastbook defaults and preferences for this browser."
      />

      <section className="space-y-4" aria-labelledby="browser-preferences">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Laptop className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="browser-preferences"
              className="font-display text-2xl font-bold tracking-tight"
            >
              Browser preferences
            </h2>
            <p className="text-sm text-muted-foreground">
              Stored only in this browser and not shared with other devices.
            </p>
          </div>
        </div>

        <FormSection
          title="Appearance"
          titleAs="h3"
          description="Use a fixed theme or follow your browser and operating system."
          action={<MonitorCog className="h-5 w-5 text-link" />}
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
        </FormSection>
      </section>

      <section className="space-y-4" aria-labelledby="application-settings">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-link">
            <Database className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="application-settings"
              className="font-display text-2xl font-bold tracking-tight"
            >
              Application settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Stored in the database and used throughout this Roastbook
              installation.
            </p>
          </div>
        </div>

        <FormSection
          title="Default currency"
          titleAs="h3"
          description="Used when adding beans, gear, and café visits."
          action={
            currencyMutation.isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <CircleDollarSign className="h-5 w-5 text-link" />
            )
          }
        >
          <CurrencyField
            id="default-currency"
            label="Currency"
            value={settings.defaultCurrency}
            disabled={currencyMutation.isSaving}
            onChange={(value) => {
              if (isCurrency(value)) void currencyMutation.save(value)
            }}
          />
        </FormSection>

        <FormSection
          title="Number format"
          titleAs="h3"
          description="Choose the decimal and thousands separators used for measurements and prices. Both separators are accepted when entering a value."
          action={
            numberFormatMutation.isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <Calculator className="h-5 w-5 text-link" />
            )
          }
        >
          <SelectField
            id="number-format"
            label="Number format"
            value={settings.numberFormat}
            disabled={numberFormatMutation.isSaving}
            options={NUMBER_FORMAT_OPTIONS}
            onChange={(value) => {
              if (isNumberFormat(value)) void numberFormatMutation.save(value)
            }}
          />
        </FormSection>

        <FormSection
          title="Date format"
          titleAs="h3"
          description="Choose how calendar dates are displayed throughout Roastbook."
          action={
            dateFormatMutation.isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <CalendarDays className="h-5 w-5 text-primary" />
            )
          }
        >
          <SelectField
            id="date-format"
            label="Date format"
            value={settings.dateFormat}
            disabled={dateFormatMutation.isSaving}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => {
              if (isDateFormat(value)) void dateFormatMutation.save(value)
            }}
          />
        </FormSection>

        <FormSection
          title="Time zone"
          titleAs="h3"
          description="Used for brew-day boundaries, streaks, and time-of-day statistics. Enter an IANA name such as Europe/Berlin."
          action={
            timeZoneMutation.isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <Globe2 className="h-5 w-5 text-link" />
            )
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <InputField
              id="time-zone"
              label="IANA time zone"
              value={settings.timeZone}
              onChange={(timeZone) =>
                setSettings((current) => ({ ...current, timeZone }))
              }
              error={
                settings.timeZone && !isTimeZone(settings.timeZone)
                  ? 'Enter a valid IANA time zone'
                  : undefined
              }
              disabled={timeZoneMutation.isSaving}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={
                timeZoneMutation.isSaving ||
                !isTimeZone(settings.timeZone) ||
                settings.timeZone === savedSettings.timeZone
              }
              onClick={() => void timeZoneMutation.save(settings.timeZone)}
            >
              Save time zone
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Default map location"
          titleAs="h3"
          description="Choose where the café explorer opens. Look up a location or enter coordinates directly."
          action={
            mapLocationMutation.isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <MapPinned className="h-5 w-5 text-link" />
            )
          }
        >
          <MapLocationSettings
            location={settings.defaultMapLocation}
            disabled={mapLocationMutation.isSaving}
            onChange={(location) => void mapLocationMutation.save(location)}
          />
        </FormSection>
      </section>

      <AiSettings stats={aiStats} />
    </Page>
  )
}
