import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Calculator,
  CalendarDays,
  CircleDollarSign,
  Coins,
  Database,
  Globe2,
  HardDrive,
  Images,
  Laptop,
  LayoutGrid,
  Loader2,
  MapPinned,
  MessagesSquare,
  MonitorCog,
  Sparkles,
  Tags,
} from 'lucide-react'
import { type ComponentType, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CurrencyField, SelectField } from '@/components/form/form-field'
import { FormPageHeader, FormSection } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import { TasteTagSettings } from '@/components/settings/taste-tag-settings'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  type AppSettings,
  DATE_FORMAT_OPTIONS,
  isCurrency,
  isDateFormat,
  isNumberFormat,
  NUMBER_FORMAT_OPTIONS,
} from '@/lib/app-settings'
import {
  COLLECTION_VIEW_OPTIONS,
  isCollectionView,
} from '@/lib/collection-view'
import {
  isThemePreference,
  THEME_OPTIONS,
  usePreferencesStore,
} from '@/lib/preferences-store'
import { getInternalStats } from '@/lib/server/internal-stats'
import {
  updateDateFormat,
  updateDefaultCurrency,
  updateDefaultListView,
  updateDefaultMapLocation,
  updateNumberFormat,
} from '@/lib/server/settings'
import { getTasteTags } from '@/lib/server/taste-tags'

export const Route = createFileRoute('/settings')({
  loader: async () => {
    const [internalStats, tasteTags] = await Promise.all([
      getInternalStats(),
      getTasteTags(),
    ])
    return { internalStats, tasteTags }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { internalStats, tasteTags } = Route.useLoaderData()
  const savedSettings = useAppSettings()
  const formatNumber = useNumberFormatter()
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>(savedSettings)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [isSavingDateFormat, setIsSavingDateFormat] = useState(false)
  const [isSavingNumberFormat, setIsSavingNumberFormat] = useState(false)
  const [isSavingListView, setIsSavingListView] = useState(false)
  const [isSavingMapLocation, setIsSavingMapLocation] = useState(false)
  const savedDefaultCurrency = savedSettings.defaultCurrency
  const savedDateFormat = savedSettings.dateFormat
  const savedListView = savedSettings.defaultListView
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
        defaultListView: savedListView,
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
      savedListView,
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

  const saveListView = async (value: string) => {
    if (!isCollectionView(value) || isSavingListView) return
    const previousView = settings.defaultListView
    setSettings((current) => ({ ...current, defaultListView: value }))
    setIsSavingListView(true)
    try {
      const updated = await updateDefaultListView({ data: value })
      setSettings((current) => ({
        ...current,
        defaultListView: updated.defaultListView,
      }))
      void router.invalidate()
    } catch {
      setSettings((current) => ({
        ...current,
        defaultListView: previousView,
      }))
      toast.error('Could not save the default list view')
    } finally {
      setIsSavingListView(false)
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
          title="Formatting"
          titleAs="h3"
          description="Choose how numbers and calendar dates are displayed. Both decimal separators are accepted when entering a value."
          action={
            isSavingNumberFormat || isSavingDateFormat ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <div className="flex items-center gap-2 text-link">
                <Calculator className="h-5 w-5" aria-hidden="true" />
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
            )
          }
          contentClassName="grid gap-4 space-y-0 sm:grid-cols-2"
        >
          <SelectField
            id="number-format"
            label="Number format"
            value={settings.numberFormat}
            disabled={isSavingNumberFormat}
            options={NUMBER_FORMAT_OPTIONS}
            onChange={(value) => void saveNumberFormat(value)}
          />
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
          title="Default list view"
          titleAs="h3"
          description="How cafés, roasters, recipes, and brewing methods are shown when you have not picked a view for that list yet. Tables keep every column on a phone and scroll sideways."
          action={
            isSavingListView ? (
              <Loader2 className="h-5 w-5 animate-spin text-link" />
            ) : (
              <LayoutGrid className="h-5 w-5 text-link" />
            )
          }
        >
          <SelectField
            id="default-list-view"
            label="List view"
            value={settings.defaultListView}
            disabled={isSavingListView}
            options={COLLECTION_VIEW_OPTIONS}
            onChange={(value) => void saveListView(value)}
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

        <FormSection
          title="Taste tags"
          titleAs="h3"
          description="The tags offered when rating shots and café visits. Removing a tag also removes it from existing entries."
          action={<Tags className="h-5 w-5 text-link" aria-hidden="true" />}
        >
          <TasteTagSettings
            tags={tasteTags}
            onChanged={() => router.invalidate()}
          />
        </FormSection>
      </section>

      <Card size="sm" role="group" aria-labelledby="internal-stats">
        <CardHeader>
          <CardTitle as="h2" id="internal-stats">
            Internal stats
          </CardTitle>
          <CardDescription>
            Live storage and AI usage for this installation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <InternalStat
              label="Stored images"
              value={storageValue(
                internalStats.storage.imageCount,
                formatNumber,
              )}
              detail={storageDetail(
                internalStats.storage.available,
                'physical files',
              )}
              icon={Images}
            />
            <InternalStat
              label="Cached favicons"
              value={storageValue(
                internalStats.storage.faviconCount,
                formatNumber,
              )}
              detail={storageDetail(
                internalStats.storage.available,
                'website icons',
              )}
              icon={Globe2}
            />
            <InternalStat
              label="Storage used"
              value={
                internalStats.storage.totalBytes === null
                  ? '—'
                  : formatBytes(internalStats.storage.totalBytes, formatNumber)
              }
              detail={storageDetail(
                internalStats.storage.available,
                `${internalStats.storage.provider.toUpperCase()} storage`,
              )}
              icon={HardDrive}
            />
            <InternalStat
              label="AI requests"
              value={formatNumber(internalStats.ai.requestCount)}
              detail="since tracking began"
              icon={MessagesSquare}
            />
            <InternalStat
              label="AI tokens"
              value={formatNumber(internalStats.ai.totalTokens)}
              detail={`${formatNumber(internalStats.ai.promptTokens)} input · ${formatNumber(internalStats.ai.completionTokens)} output`}
              icon={Sparkles}
            />
            <InternalStat
              label="AI cost estimate"
              value={formatUsd(internalStats.ai.estimatedCostUsd, formatNumber)}
              detail="token usage only"
              icon={Coins}
            />
          </dl>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            {internalStats.ai.pricedTokens < internalStats.ai.totalTokens
              ? 'Cost is partial because unknown model rates are excluded. Tool fees are not included.'
              : 'Cost uses OpenAI standard token rates. Tool fees are not included.'}
          </p>
        </CardContent>
      </Card>
    </Page>
  )
}

type NumberFormatter = (value: number | string, grouping?: boolean) => string

function InternalStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly icon: ComponentType<{
    readonly className?: string
    readonly 'aria-hidden'?: boolean
  }>
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden={true} />
        <span>{label}</span>
      </dt>
      <dd className="mt-1">
        <span className="block font-display text-xl font-bold leading-none tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {detail}
        </span>
      </dd>
    </div>
  )
}

function storageValue(value: number | null, formatNumber: NumberFormatter) {
  return value === null ? '—' : formatNumber(value)
}

function storageDetail(available: boolean, detail: string) {
  return available ? detail : 'Configured storage is unavailable'
}

function formatBytes(bytes: number, formatNumber: NumberFormatter) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  if (bytes <= 0) return '0 B'

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** unitIndex
  const precision = unitIndex === 0 || value >= 10 ? 0 : 1
  return `${formatNumber(value.toFixed(precision))} ${units[unitIndex]}`
}

function formatUsd(value: string, formatNumber: NumberFormatter) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '$0.00'
  const precision = amount < 0.01 ? 4 : 2
  return `$${formatNumber(amount.toFixed(precision))}`
}
