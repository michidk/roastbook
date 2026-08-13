export const AUTO_STOP_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "weight", label: "Weight" },
  { value: "time", label: "Time" },
  { value: "volume", label: "Volume" },
] as const

type AutoStopMode = (typeof AUTO_STOP_OPTIONS)[number]["value"]

export type MachineSettingsValues = {
  readonly brewPressureOpvBar: string | null
  readonly supportsPreinfusion: boolean | null
  readonly defaultPreinfusionEnabled: boolean | null
  readonly defaultPreinfusionTimeSeconds: string | null
  readonly defaultPreinfusionPressureBar: string | null
  readonly defaultFlowLimitMlPerSecond: string | null
  readonly temperatureOffsetCelsius: string | null
  readonly volumetricShotVolumeMl: string | null
  readonly autoStopMode: AutoStopMode | null
  readonly steamTemperatureCelsius: string | null
  readonly steamPressureBar: string | null
}

export type BasketDetailsValues = {
  readonly nominalDoseGrams: string | null
}
