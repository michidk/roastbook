import { InputField, SelectField } from "@/components/form/form-field"
import { FormSection } from "@/components/form/form-shell"
import { AUTO_STOP_OPTIONS } from "@/lib/gear-parameters"
import type { GearType } from "@/lib/constants"

export type GearSubtypeFormValues = {
  readonly brewPressureOpvBar: string
  readonly supportsPreinfusion: string
  readonly defaultPreinfusionEnabled: string
  readonly defaultPreinfusionTimeSeconds: string
  readonly defaultPreinfusionPressureBar: string
  readonly defaultFlowLimitMlPerSecond: string
  readonly temperatureOffsetCelsius: string
  readonly volumetricShotVolumeMl: string
  readonly autoStopMode: string
  readonly steamTemperatureCelsius: string
  readonly steamPressureBar: string
  readonly nominalDoseGrams: string
}

export const EMPTY_GEAR_SUBTYPE_VALUES: GearSubtypeFormValues = {
  brewPressureOpvBar: "",
  supportsPreinfusion: "",
  defaultPreinfusionEnabled: "",
  defaultPreinfusionTimeSeconds: "",
  defaultPreinfusionPressureBar: "",
  defaultFlowLimitMlPerSecond: "",
  temperatureOffsetCelsius: "",
  volumetricShotVolumeMl: "",
  autoStopMode: "",
  steamTemperatureCelsius: "",
  steamPressureBar: "",
  nominalDoseGrams: "",
}

type GearSubtypeFieldsProps = {
  readonly type: GearType | ""
  readonly values: GearSubtypeFormValues
  readonly onChange: <Key extends keyof GearSubtypeFormValues>(
    key: Key,
    value: GearSubtypeFormValues[Key],
  ) => void
}

const BOOLEAN_OPTIONS = [
  { value: "", label: "Unknown" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const

export function GearSubtypeFields({ type, values, onChange }: GearSubtypeFieldsProps) {
  if (type === "basket") {
    return (
      <FormSection title="Basket details" description="Record the dose range this basket is designed around.">
        <InputField id="basket-dose" label="Nominal dose (g)" type="number" min="0" step="0.01" value={values.nominalDoseGrams} onChange={(value) => onChange("nominalDoseGrams", value)} />
      </FormSection>
    )
  }
  if (type !== "espresso_machine") return null

  return (
    <FormSection title="Machine settings" description="Capabilities and defaults stay optional so unknown values remain honest.">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <InputField id="machine-opv" label="Brew pressure / OPV (bar)" type="number" min="0" step="0.01" value={values.brewPressureOpvBar} onChange={(value) => onChange("brewPressureOpvBar", value)} />
        <SelectField id="machine-preinfusion-support" label="Supports pre-infusion" value={values.supportsPreinfusion} onChange={(value) => onChange("supportsPreinfusion", value)} options={BOOLEAN_OPTIONS} />
        <SelectField id="machine-preinfusion-default" label="Pre-infusion enabled by default" value={values.defaultPreinfusionEnabled} onChange={(value) => onChange("defaultPreinfusionEnabled", value)} options={BOOLEAN_OPTIONS} />
        <InputField id="machine-preinfusion-time" label="Default pre-infusion time (s)" type="number" min="0" step="0.01" value={values.defaultPreinfusionTimeSeconds} onChange={(value) => onChange("defaultPreinfusionTimeSeconds", value)} />
        <InputField id="machine-preinfusion-pressure" label="Default pre-infusion pressure (bar)" type="number" min="0" step="0.01" value={values.defaultPreinfusionPressureBar} onChange={(value) => onChange("defaultPreinfusionPressureBar", value)} />
        <InputField id="machine-flow-limit" label="Default flow limit (mL/s)" type="number" min="0" step="0.01" value={values.defaultFlowLimitMlPerSecond} onChange={(value) => onChange("defaultFlowLimitMlPerSecond", value)} />
        <InputField id="machine-temperature-offset" label="Temperature offset (°C)" type="number" step="0.1" value={values.temperatureOffsetCelsius} onChange={(value) => onChange("temperatureOffsetCelsius", value)} />
        <InputField id="machine-shot-volume" label="Volumetric shot volume (mL)" type="number" min="0" step="0.01" value={values.volumetricShotVolumeMl} onChange={(value) => onChange("volumetricShotVolumeMl", value)} />
        <SelectField id="machine-auto-stop" label="Auto-stop mode" value={values.autoStopMode} onChange={(value) => onChange("autoStopMode", value)} options={AUTO_STOP_OPTIONS} />
        <InputField id="machine-steam-temperature" label="Steam temperature (°C)" type="number" min="0" step="0.1" value={values.steamTemperatureCelsius} onChange={(value) => onChange("steamTemperatureCelsius", value)} />
        <InputField id="machine-steam-pressure" label="Steam pressure (bar)" type="number" min="0" step="0.01" value={values.steamPressureBar} onChange={(value) => onChange("steamPressureBar", value)} />
      </div>
    </FormSection>
  )
}
