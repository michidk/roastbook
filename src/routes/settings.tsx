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
import {
  CurrencyField,
  InputField,
  SelectField,
} from '@/components/form/form-field'
import { FormPageHeader, FormSection } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { AiSettings } from '@/components/settings/ai-settings'
import { MapLocationSettings } from '@/components/settings/map-location-settings'
import { TasteTagSettings } from '@/components/settings/taste-tag-settings'
import { Button } from '@/components/ui/button'
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
  isTimeZone,
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
import { getAiRequestStats } from '@/lib/server/ai-request-logs'
import { getInternalStats } from '@/lib/server/internal-stats'
import {
  updateDateFormat,
  updateDefaultCurrency,
  updateDefaultListView,
  updateDefaultMapLocation,
  updateNumberFormat,
  updateTimeZone,
} from '@/lib/server/settings'
import { getTasteTags } from '@/lib/server/taste-tags'

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
  const { aiStats, internalStats, tasteTags } = Route.useLoaderData()
  const savedSettings = useAppSettings()
  const formatNumber = useNumberFormatter()
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings>(savedSettings)
  const savedDefaultCurrency = savedSettings.defaultCurrency
  const savedDateFormat = savedSettings.dateFormat
  const savedListView = savedSettings.defaultListView
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
        defaultListView: savedListView,
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
      savedListView,
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
  const listViewMutation = useSettingMutation({
    savedValue: savedListView,
    applyValue: (defaultListView) =>
      setSettings((current) => ({ ...current, defaultListView })),
    mutate: (defaultListView) =>
      updateDefaultListView({ data: defaultListView }),
    selectValue: (updated) => updated.defaultListView,
    onSaved,
    errorMessage: 'Could not save the default list view',
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
          title="Formatting"
          titleAs="h3"
          description="Choose how numbers and calendar dates are displayed. Both decimal separators are accepted when entering a value."
          action={
            numberFormatMutation.isSaving || dateFormatMutation.isSaving ? (
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
            disabled={numberFormatMutation.isSaving}
            options={NUMBER_FORMAT_OPTIONS}
            onChange={(value) => {
              if (isNumberFormat(value)) void numberFormatMutation.save(value)
            }}
          />
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
          title="Default list view"
          titleAs="h3"
          description="How cafés, roasters, recipes, and brewing methods are shown when you have not picked a view for that list yet. Tables keep every column on a phone and scroll sideways."
          action={
            listViewMutation.isSaving ? (
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
            disabled={listViewMutation.isSaving}
            options={COLLECTION_VIEW_OPTIONS}
            onChange={(value) => {
              if (isCollectionView(value)) void listViewMutation.save(value)
            }}
          />
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

      <AiSettings stats={aiStats} />

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
