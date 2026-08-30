import { useMemo } from 'react'
import type { GearSubtypeFormValues } from '@/components/gear/gear-form-values'
import { SelectableDiffDialog } from '@/components/selectable-diff-dialog'
import {
  buildSelectableDiffs,
  type SelectableDiffDefinition,
} from '@/hooks/use-selectable-diffs'
import type { ExtractedMachineSettings } from '@/modules/ai/read-models'

type MachineSettingKey = keyof ExtractedMachineSettings

type FieldDefinition = SelectableDiffDefinition<MachineSettingKey>

const withUnit = (unit: string) => (value: string) => `${value} ${unit}`

const FIELDS: readonly FieldDefinition[] = [
  {
    key: 'brewPressureOpvBar',
    label: 'Brew pressure / OPV',
    format: withUnit('bar'),
  },
  {
    key: 'supportsPreinfusion',
    label: 'Supports pre-infusion',
    format: formatBoolean,
  },
  {
    key: 'defaultPreinfusionEnabled',
    label: 'Pre-infusion enabled by default',
    format: formatBoolean,
  },
  {
    key: 'defaultPreinfusionTimeSeconds',
    label: 'Default pre-infusion time',
    format: withUnit('s'),
  },
  {
    key: 'defaultPreinfusionPressureBar',
    label: 'Default pre-infusion pressure',
    format: withUnit('bar'),
  },
  {
    key: 'defaultFlowLimitMlPerSecond',
    label: 'Default flow limit',
    format: withUnit('mL/s'),
  },
  {
    key: 'temperatureOffsetCelsius',
    label: 'Temperature offset',
    format: withUnit('°C'),
  },
  {
    key: 'volumetricShotVolumeMl',
    label: 'Volumetric shot volume',
    format: withUnit('mL'),
  },
  {
    key: 'autoStopMode',
    label: 'Auto-stop mode',
    format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
  },
  {
    key: 'steamTemperatureCelsius',
    label: 'Steam temperature',
    format: withUnit('°C'),
  },
  {
    key: 'steamPressureBar',
    label: 'Steam pressure',
    format: withUnit('bar'),
  },
]

function formatBoolean(value: string) {
  return value === 'true' ? 'Yes' : 'No'
}

type MachineSettingsDiffModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentData: GearSubtypeFormValues
  suggestedData: ExtractedMachineSettings
  onApply: (updates: Partial<GearSubtypeFormValues>) => void
}

export function MachineSettingsDiffModal({
  open,
  onOpenChange,
  currentData,
  suggestedData,
  onApply,
}: MachineSettingsDiffModalProps) {
  const diffs = useMemo(
    () =>
      buildSelectableDiffs(FIELDS, (field) => {
        const researchedValue = suggestedData[field.key]
        if (researchedValue === undefined) return undefined
        return {
          currentValue: currentData[field.key],
          suggestedValue: researchedValue,
        }
      }),
    [currentData, suggestedData],
  )

  return (
    <SelectableDiffDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Review machine settings"
      emptyDescription="The research did not find any settings that differ from the current values."
      diffs={diffs}
      onApply={(selectedDiffs) => {
        const updates: Partial<GearSubtypeFormValues> = {}
        for (const diff of selectedDiffs) {
          ;(updates as Record<MachineSettingKey, string>)[diff.key] =
            diff.suggestedValue
        }
        onApply(updates)
      }}
    />
  )
}
