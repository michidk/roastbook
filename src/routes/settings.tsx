import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Calculator,
  CalendarDays,
  CircleDollarSign,
  Database,
  Laptop,
  Loader2,
  MapPinned,
  MonitorCog,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CurrencyField, SelectField } from '@/components/form/form-field'
import { FormPageHeader, FormSection } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import { useAppSettings } from '@/hooks/use-app-settings'
import {
  type AppSettings,
  DATE_FORMAT_OPTIONS,
  isCurrency,
  isDateFormat,
  isNumberFormat,
  NUMBER_FORMAT_OPTIONS,
} from '@/lib/app-settings'
import {
  isThemePreference,
  THEME_OPTIONS,
  usePreferencesStore,
} from '@/lib/preferences-store'
import {
  updateDateFormat,
  updateDefaultCurrency,
  updateDefaultMapLocation,
  updateNumberFormat,
} from '@/lib/server/settings'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const savedSettings = useAppSettings()
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>(savedSettings)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [isSavingDateFormat, setIsSavingDateFormat] = useState(false)
  const [isSavingNumberFormat, setIsSavingNumberFormat] = useState(false)
  const [isSavingMapLocation, setIsSavingMapLocation] = useState(false)
  const savedDefaultCurrency = savedSettings.defaultCurrency
  const savedDateFormat = savedSettings.dateFormat
  const savedNumberFormat = savedSettings.numberFormat
  const savedMapLatitude = savedSettings.defaultMapLocation?.latitude
  const savedMapLongitude = savedSettings.defaultMapLocation?.longitude
  const savedMapLabel = savedSettings.defaultMapLocation?.label
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
    ],
  )

  const saveCurrency = async (value: string) => {
    if (!isCurrency(value) || isSavingCurrency) return
    const previousCurrency = settings.defaultCurrency
    setSettings((current) => ({ ...current, defaultCurrency: value }))
    setIsSavingCurrency(true)
    try {
      const updated = await updateDefaultCurrency({ data: value })
      setSettings((current) => ({
        ...current,
        defaultCurrency: updated.defaultCurrency,
      }))
      void router.invalidate()
    } catch {
      setSettings((current) => ({
        ...current,
        defaultCurrency: previousCurrency,
      }))
      toast.error('Could not save the default currency')
    } finally {
      setIsSavingCurrency(false)
    }
  }

  const saveMapLocation = async (
    location: AppSettings['defaultMapLocation'],
  ) => {
    if (isSavingMapLocation) return
    const previousLocation = settings.defaultMapLocation
    setSettings((current) => ({
      ...current,
      defaultMapLocation: location,
    }))
    setIsSavingMapLocation(true)
    try {
      const updated = await updateDefaultMapLocation({ data: location })
      setSettings((current) => ({
        ...current,
        defaultMapLocation: updated.defaultMapLocation,
      }))
      void router.invalidate()
    } catch {
      setSettings((current) => ({
        ...current,
        defaultMapLocation: previousLocation,
      }))
      toast.error('Could not save the default map location')
    } finally {
      setIsSavingMapLocation(false)
    }
  }

  const saveDateFormat = async (value: string) => {
    if (!isDateFormat(value) || isSavingDateFormat) return
    const previousFormat = settings.dateFormat
    setSettings((current) => ({ ...current, dateFormat: value }))
    setIsSavingDateFormat(true)
    try {
      const updated = await updateDateFormat({ data: value })
      setSettings((current) => ({
        ...current,
        dateFormat: updated.dateFormat,
      }))
      void router.invalidate()
    } catch {
      setSettings((current) => ({
        ...current,
        dateFormat: previousFormat,
      }))
      toast.error('Could not save the date format')
    } finally {
      setIsSavingDateFormat(false)
    }
  }

  const saveNumberFormat = async (value: string) => {
    if (!isNumberFormat(value) || isSavingNumberFormat) return
    const previousFormat = settings.numberFormat
    setSettings((current) => ({ ...current, numberFormat: value }))
    setIsSavingNumberFormat(true)
    try {
      const updated = await updateNumberFormat({ data: value })
      setSettings((current) => ({
        ...current,
        numberFormat: updated.numberFormat,
      }))
      void router.invalidate()
    } catch {
      setSettings((current) => ({
        ...current,
        numberFormat: previousFormat,
      }))
      toast.error('Could not save the number format')
    } finally {
      setIsSavingNumberFormat(false)
    }
  }

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
            isSavingCurrency ? (
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
            disabled={isSavingCurrency}
            onChange={(value) => void saveCurrency(value)}
          />
        </FormSection>

        <FormSection
          title="Number format"
          titleAs="h3"
          description="Choose the decimal and thousands separators used for measurements and prices. Both separators are accepted when entering a value."
          action={
            isSavingNumberFormat ? (
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
            disabled={isSavingNumberFormat}
            options={NUMBER_FORMAT_OPTIONS}
            onChange={(value) => void saveNumberFormat(value)}
          />
        </FormSection>

        <FormSection
          title="Date format"
          titleAs="h3"
          description="Choose how calendar dates are displayed throughout Roastbook."
          action={
            isSavingDateFormat ? (
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
            disabled={isSavingDateFormat}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => void saveDateFormat(value)}
          />
        </FormSection>

        <FormSection
          title="Default map location"
          titleAs="h3"
          description="Choose where the café explorer opens. Look up a location or enter coordinates directly."
          action={
            isSavingMapLocation ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <MapPinned className="h-5 w-5 text-link" />
            )
          }
        >
          <MapLocationSettings
            location={settings.defaultMapLocation}
            disabled={isSavingMapLocation}
            onChange={(location) => void saveMapLocation(location)}
          />
        </FormSection>
      </section>
    </Page>
  )
}
