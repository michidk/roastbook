import { ArrowRight, Check, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { GearSubtypeFormValues } from '@/components/gear/gear-form-values'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MACHINE_FLOW_CONTROL_OPTIONS,
  MACHINE_HEATING_ARCHITECTURE_OPTIONS,
  MACHINE_PREINFUSION_CONTROL_OPTIONS,
  MACHINE_PRESSURE_CONTROL_OPTIONS,
  MACHINE_PUMP_TYPE_OPTIONS,
  MACHINE_STEAM_SYSTEM_OPTIONS,
  MACHINE_TEMPERATURE_CONTROL_OPTIONS,
  MACHINE_WATER_SOURCE_OPTIONS,
  optionLabel,
  type SelectOption,
  SHOT_STOP_MODE_OPTIONS,
} from '@/lib/gear-properties'
import type { GearPropertyEvidenceInput } from '@/lib/gear-property-schemas'
import { toJsonValue } from '@/lib/json-value'
import { cn } from '@/lib/utils'
import type {
  ExtractedMachineResearch,
  MachineResearchPropertyKey,
} from '@/modules/ai/read-models'

type FormValue = GearSubtypeFormValues[keyof GearSubtypeFormValues]

type FieldDefinition = {
  readonly propertyKey: MachineResearchPropertyKey
  readonly formKey: keyof GearSubtypeFormValues
  readonly label: string
  readonly unit?: string
  readonly read: (research: ExtractedMachineResearch) => unknown
  readonly options?: readonly SelectOption[]
  readonly boolean?: boolean
}

const FIELDS: readonly FieldDefinition[] = [
  {
    propertyKey: 'specifications.portafilterDiameterMm',
    formKey: 'machinePortafilterDiameterMm',
    label: 'Portafilter diameter',
    unit: 'mm',
    read: (research) => research.specifications?.portafilterDiameterMm,
  },
  {
    propertyKey: 'specifications.heatingArchitecture',
    formKey: 'machineHeatingArchitecture',
    label: 'Heating architecture',
    read: (research) => research.specifications?.heatingArchitecture,
    options: MACHINE_HEATING_ARCHITECTURE_OPTIONS,
  },
  {
    propertyKey: 'specifications.temperatureControl',
    formKey: 'machineTemperatureControl',
    label: 'Temperature control',
    read: (research) => research.specifications?.temperatureControl,
    options: MACHINE_TEMPERATURE_CONTROL_OPTIONS,
  },
  {
    propertyKey: 'specifications.pressureControl',
    formKey: 'machinePressureControl',
    label: 'Pressure control',
    read: (research) => research.specifications?.pressureControl,
    options: MACHINE_PRESSURE_CONTROL_OPTIONS,
  },
  {
    propertyKey: 'specifications.flowControl',
    formKey: 'machineFlowControl',
    label: 'Flow control',
    read: (research) => research.specifications?.flowControl,
    options: MACHINE_FLOW_CONTROL_OPTIONS,
  },
  {
    propertyKey: 'specifications.preinfusionControl',
    formKey: 'machinePreinfusionControl',
    label: 'Pre-infusion control',
    read: (research) => research.specifications?.preinfusionControl,
    options: MACHINE_PREINFUSION_CONTROL_OPTIONS,
  },
  {
    propertyKey: 'specifications.shotStopModes',
    formKey: 'machineShotStopModes',
    label: 'Supported shot stop modes',
    read: (research) => research.specifications?.shotStopModes,
    options: SHOT_STOP_MODE_OPTIONS,
  },
  {
    propertyKey: 'specifications.steamSystem',
    formKey: 'machineSteamSystem',
    label: 'Steam system',
    read: (research) => research.specifications?.steamSystem,
    options: MACHINE_STEAM_SYSTEM_OPTIONS,
  },
  {
    propertyKey: 'specifications.simultaneousBrewAndSteam',
    formKey: 'machineSimultaneousBrewAndSteam',
    label: 'Simultaneous brew and steam',
    read: (research) => research.specifications?.simultaneousBrewAndSteam,
    boolean: true,
  },
  {
    propertyKey: 'specifications.groupCount',
    formKey: 'machineGroupCount',
    label: 'Group count',
    read: (research) => research.specifications?.groupCount,
  },
  {
    propertyKey: 'specifications.pumpType',
    formKey: 'machinePumpType',
    label: 'Pump type',
    read: (research) => research.specifications?.pumpType,
    options: MACHINE_PUMP_TYPE_OPTIONS,
  },
  {
    propertyKey: 'specifications.waterSourceModes',
    formKey: 'machineWaterSourceModes',
    label: 'Supported water sources',
    read: (research) => research.specifications?.waterSourceModes,
    options: MACHINE_WATER_SOURCE_OPTIONS,
  },
  {
    propertyKey: 'specifications.brewPressureMinimumBar',
    formKey: 'machineBrewPressureMinimumBar',
    label: 'Minimum brew pressure',
    unit: 'bar',
    read: (research) => research.specifications?.brewPressureMinimumBar,
  },
  {
    propertyKey: 'specifications.brewPressureMaximumBar',
    formKey: 'machineBrewPressureMaximumBar',
    label: 'Maximum brew pressure',
    unit: 'bar',
    read: (research) => research.specifications?.brewPressureMaximumBar,
  },
  {
    propertyKey: 'specifications.brewTemperatureMinimumCelsius',
    formKey: 'machineBrewTemperatureMinimumCelsius',
    label: 'Minimum brew temperature',
    unit: '°C',
    read: (research) => research.specifications?.brewTemperatureMinimumCelsius,
  },
  {
    propertyKey: 'specifications.brewTemperatureMaximumCelsius',
    formKey: 'machineBrewTemperatureMaximumCelsius',
    label: 'Maximum brew temperature',
    unit: '°C',
    read: (research) => research.specifications?.brewTemperatureMaximumCelsius,
  },
  {
    propertyKey: 'factorySettings.brewPressureBar',
    formKey: 'factoryBrewPressureBar',
    label: 'Factory brew pressure',
    unit: 'bar',
    read: (research) => research.factorySettings?.brewPressureBar,
  },
  {
    propertyKey: 'factorySettings.preinfusionEnabled',
    formKey: 'factoryPreinfusionEnabled',
    label: 'Factory pre-infusion enabled',
    read: (research) => research.factorySettings?.preinfusionEnabled,
    boolean: true,
  },
  {
    propertyKey: 'factorySettings.preinfusionTimeSeconds',
    formKey: 'factoryPreinfusionTimeSeconds',
    label: 'Factory pre-infusion time',
    unit: 's',
    read: (research) => research.factorySettings?.preinfusionTimeSeconds,
  },
  {
    propertyKey: 'factorySettings.preinfusionPressureBar',
    formKey: 'factoryPreinfusionPressureBar',
    label: 'Factory pre-infusion pressure',
    unit: 'bar',
    read: (research) => research.factorySettings?.preinfusionPressureBar,
  },
  {
    propertyKey: 'factorySettings.flowLimitMlPerSecond',
    formKey: 'factoryFlowLimitMlPerSecond',
    label: 'Factory flow limit',
    unit: 'mL/s',
    read: (research) => research.factorySettings?.flowLimitMlPerSecond,
  },
  {
    propertyKey: 'factorySettings.brewTemperatureOffsetCelsius',
    formKey: 'factoryBrewTemperatureOffsetCelsius',
    label: 'Factory brew temperature offset',
    unit: '°C',
    read: (research) => research.factorySettings?.brewTemperatureOffsetCelsius,
  },
  {
    propertyKey: 'factorySettings.programmedVolumeMl',
    formKey: 'factoryProgrammedVolumeMl',
    label: 'Factory programmed volume',
    unit: 'mL',
    read: (research) => research.factorySettings?.programmedVolumeMl,
  },
  {
    propertyKey: 'factorySettings.defaultStopMode',
    formKey: 'factoryDefaultStopMode',
    label: 'Factory default stop mode',
    read: (research) => research.factorySettings?.defaultStopMode,
    options: SHOT_STOP_MODE_OPTIONS,
  },
  {
    propertyKey: 'factorySettings.steamTemperatureCelsius',
    formKey: 'factorySteamTemperatureCelsius',
    label: 'Factory steam temperature',
    unit: '°C',
    read: (research) => research.factorySettings?.steamTemperatureCelsius,
  },
  {
    propertyKey: 'factorySettings.steamPressureBar',
    formKey: 'factorySteamPressureBar',
    label: 'Factory steam pressure',
    unit: 'bar',
    read: (research) => research.factorySettings?.steamPressureBar,
  },
]

function toFormValue(value: unknown): FormValue | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return value.map(String)
  return String(value)
}

function valuesMatch(left: FormValue, right: FormValue) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isUnknown(value: FormValue) {
  return value === '' || value === null
}

function displayValue(field: FieldDefinition, value: FormValue) {
  if (value === null || value === '') return 'Unknown'
  if (typeof value !== 'string') {
    if (value.length === 0) return 'None'
    return value
      .map((item) => optionLabel(field.options ?? [], item) ?? item)
      .join(', ')
  }
  if (field.boolean) return value === 'true' ? 'Yes' : 'No'
  const formatted = field.options
    ? (optionLabel(field.options, value) ?? value)
    : value
  return field.unit ? `${formatted} ${field.unit}` : formatted
}

type Diff = {
  readonly field: FieldDefinition
  readonly currentValue: FormValue
  readonly suggestedValue: FormValue
  readonly normalizedValue: unknown
  readonly hasConflict: boolean
}

export type MachineResearchApplication = {
  readonly values: Partial<GearSubtypeFormValues>
  readonly evidence: readonly GearPropertyEvidenceInput[]
}

type MachineResearchDiffModalProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly currentData: GearSubtypeFormValues
  readonly suggestedData: ExtractedMachineResearch
  readonly onApply: (application: MachineResearchApplication) => void
}

export function MachineResearchDiffModal({
  open,
  onOpenChange,
  currentData,
  suggestedData,
  onApply,
}: MachineResearchDiffModalProps) {
  const diffs = useMemo<Diff[]>(() => {
    const result: Diff[] = []
    for (const field of FIELDS) {
      const normalizedValue = field.read(suggestedData)
      const suggestedValue = toFormValue(normalizedValue)
      if (suggestedValue === undefined) continue
      const currentValue = currentData[field.formKey]
      if (valuesMatch(currentValue, suggestedValue)) continue
      result.push({
        field,
        currentValue,
        suggestedValue,
        normalizedValue,
        hasConflict: !isUnknown(currentValue),
      })
    }
    return result
  }, [currentData, suggestedData])

  const [selectedFields, setSelectedFields] = useState<
    Set<MachineResearchPropertyKey>
  >(new Set())

  useEffect(() => {
    if (!open) return
    setSelectedFields(
      new Set(
        diffs
          .filter((diff) => !diff.hasConflict)
          .map((diff) => diff.field.propertyKey),
      ),
    )
  }, [diffs, open])

  const toggleField = (key: MachineResearchPropertyKey) => {
    setSelectedFields((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleApply = () => {
    const updates: Partial<GearSubtypeFormValues> = {}
    const valuesByPath = new Map<MachineResearchPropertyKey, unknown>()
    for (const diff of diffs) {
      if (!selectedFields.has(diff.field.propertyKey)) continue
      Object.assign(updates, { [diff.field.formKey]: diff.suggestedValue })
      valuesByPath.set(diff.field.propertyKey, diff.normalizedValue)
    }
    const evidence = (suggestedData.evidence ?? [])
      .filter((item) => selectedFields.has(item.propertyKey))
      .map((item) => ({
        propertyKey: item.propertyKey,
        valueJson: toJsonValue(valuesByPath.get(item.propertyKey)),
        sourceUrl: item.sourceUrl,
        sourceTitle: item.sourceTitle ?? null,
        sourceKind: item.sourceKind,
        rawValue: item.rawValue ?? null,
        rawUnit: item.rawUnit ?? null,
      }))
    onApply({ values: updates, evidence })
    onOpenChange(false)
  }

  const conflictCount = diffs.filter((diff) => diff.hasConflict).length
  const allSelected = diffs.length > 0 && selectedFields.size === diffs.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="gap-1">
          <DialogTitle>Review machine research</DialogTitle>
          <DialogDescription>
            {diffs.length === 0
              ? 'The research found no sourced specifications or factory defaults that differ from the current values.'
              : `${diffs.length} sourced suggestion${diffs.length === 1 ? '' : 's'} found${conflictCount > 0 ? ` · ${conflictCount} replace existing values` : ''}. Your current setup is never changed by research.`}
          </DialogDescription>
        </DialogHeader>

        {diffs.length > 0 ? (
          <DialogBody>
            <div className="overflow-hidden rounded-xl border bg-card">
              {diffs.map((diff) => {
                const selected = selectedFields.has(diff.field.propertyKey)
                const sources = (suggestedData.evidence ?? []).filter(
                  (item) => item.propertyKey === diff.field.propertyKey,
                )
                return (
                  <div
                    key={diff.field.propertyKey}
                    className="px-3 py-2.5 [&+&]:border-t"
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleField(diff.field.propertyKey)}
                      className={cn(
                        '-m-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-lg p-1 text-left transition-colors',
                        selected
                          ? 'bg-primary/[0.06] hover:bg-primary/10'
                          : 'hover:bg-muted/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 bg-background',
                        )}
                      >
                        {selected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {diff.field.label}
                          </span>
                          {diff.hasConflict ? (
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Existing
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-sm sm:mt-0">
                          {diff.hasConflict ? (
                            <>
                              <span className="max-w-28 truncate text-muted-foreground line-through">
                                {displayValue(diff.field, diff.currentValue)}
                              </span>
                              <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                            </>
                          ) : null}
                          <span className="max-w-44 truncate font-semibold text-foreground">
                            {displayValue(diff.field, diff.suggestedValue)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <div className="mt-1.5 ml-7 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {sources.map((source) => (
                        <a
                          key={`${source.sourceUrl}-${source.rawValue ?? ''}`}
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-6 items-center gap-1 text-link hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          {source.sourceTitle ??
                            new URL(source.sourceUrl).hostname}
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </DialogBody>
        ) : null}

        <DialogFooter className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          {diffs.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelectedFields(
                  allSelected
                    ? new Set()
                    : new Set(diffs.map((diff) => diff.field.propertyKey)),
                )
              }
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {diffs.length === 0 ? 'Close' : 'Cancel'}
            </Button>
            {diffs.length > 0 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={selectedFields.size === 0}
              >
                Apply ({selectedFields.size})
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
