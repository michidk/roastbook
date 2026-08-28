import {
  Calculator,
  CircleDollarSign,
  Globe2,
  LayoutGrid,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CurrencyField, SelectField } from '@/components/form/form-field'
import { TimeZoneField } from '@/components/form/time-zone-field'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import {
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
  updateDateFormat,
  updateDefaultCurrency,
  updateDefaultListView,
  updateNumberFormat,
  updateTimeZone,
} from '@/lib/server/settings'

/** The currency, formatting, time zone, and list view settings sections. */
export function GeneralSettings({ onSaved }: { readonly onSaved: () => void }) {
  const savedSettings = useAppSettings()
  const savedDefaultCurrency = savedSettings.defaultCurrency
  const savedDateFormat = savedSettings.dateFormat
  const savedListView = savedSettings.defaultListView
  const savedNumberFormat = savedSettings.numberFormat
  const savedTimeZone = savedSettings.timeZone
  const [settings, setSettings] = useState({
    defaultCurrency: savedDefaultCurrency,
    dateFormat: savedDateFormat,
    defaultListView: savedListView,
    numberFormat: savedNumberFormat,
    timeZone: savedTimeZone,
  })

  useEffect(
    () =>
      setSettings({
        defaultCurrency: savedDefaultCurrency,
        dateFormat: savedDateFormat,
        defaultListView: savedListView,
        numberFormat: savedNumberFormat,
        timeZone: savedTimeZone,
      }),
    [
      savedDefaultCurrency,
      savedDateFormat,
      savedListView,
      savedNumberFormat,
      savedTimeZone,
    ],
  )

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

  return (
    <>
      <SettingsPanelSection
        title="Default currency"
        description="Used when adding beans, gear, and café visits."
        action={
          currencyMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <CircleDollarSign className="size-5 text-link" />
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
      </SettingsPanelSection>

      <SettingsPanelSection
        title="Formatting"
        description="Choose how numbers and calendar dates are displayed. Both decimal separators are accepted when entering a value."
        action={
          numberFormatMutation.isSaving || dateFormatMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Calculator className="size-5 text-link" />
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
      </SettingsPanelSection>

      <SettingsPanelSection
        title="Time zone"
        description="Used for brew-day boundaries, streaks, and time-of-day statistics."
        action={
          timeZoneMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Globe2 className="size-5 text-link" />
          )
        }
      >
        <TimeZoneField
          id="time-zone"
          value={settings.timeZone}
          disabled={timeZoneMutation.isSaving}
          onChange={(timeZone) => void timeZoneMutation.save(timeZone)}
        />
      </SettingsPanelSection>

      <SettingsPanelSection
        title="Default list view"
        description="How cafés, roasters, recipes, and brewing methods are shown before you choose a view for a list."
        action={
          listViewMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <LayoutGrid className="size-5 text-link" />
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
      </SettingsPanelSection>
    </>
  )
}
