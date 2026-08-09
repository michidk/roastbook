import type { BrewingMethod } from "@/lib/recipes"

export const RECIPE_FIELD_KEYS = [
  "bean",
  "target_dose",
  "brew_water",
  "grinder",
  "grind_setting",
  "target_yield",
  "brew_ratio",
  "target_time",
  "brew_temperature",
  "preinfusion_time",
  "preinfusion_pressure",
  "bloom_time",
  "target_pressure",
  "target_flow_rate",
  "basket",
  "puck_screen",
  "paper_filter",
  "distribution_method",
  "tamp_force",
  "accessories",
  "notes",
] as const

export type RecipeFieldKey = (typeof RECIPE_FIELD_KEYS)[number]

export const RATIO_BASIS_OPTIONS = [
  { value: "target_yield", label: "Target yield" },
  { value: "brew_water", label: "Brew water" },
] as const

export type RatioBasis = (typeof RATIO_BASIS_OPTIONS)[number]["value"]

export const PAPER_FILTER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "both", label: "Top and bottom" },
] as const

export type PaperFilterPosition =
  (typeof PAPER_FILTER_OPTIONS)[number]["value"]

export const AUTO_STOP_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "weight", label: "Weight" },
  { value: "time", label: "Time" },
  { value: "volume", label: "Volume" },
] as const

export type AutoStopMode = (typeof AUTO_STOP_OPTIONS)[number]["value"]

export type RecipeValues = {
  readonly name: string
  readonly brewingMethod: BrewingMethod
  readonly beanId: number | null
  readonly targetDoseGrams: string | null
  readonly brewWaterGrams: string | null
  readonly ratioBasis: RatioBasis | null
  readonly grinderId: number | null
  readonly grindSetting: string | null
  readonly targetYieldGrams: string | null
  readonly targetTimeMinSeconds: string | null
  readonly targetTimeMaxSeconds: string | null
  readonly brewTemperatureCelsius: string | null
  readonly preinfusionTimeSeconds: string | null
  readonly preinfusionPressureBar: string | null
  readonly bloomTimeSeconds: string | null
  readonly targetBrewPressureBar: string | null
  readonly targetFlowRateMlPerSecond: string | null
  readonly basketId: number | null
  readonly usesPuckScreen: boolean | null
  readonly paperFilterPosition: PaperFilterPosition | null
  readonly distributionMethod: string | null
  readonly tampForceKg: string | null
  readonly notes: string | null
  readonly enabledFields: readonly RecipeFieldKey[]
}

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

export const RECIPE_FIELD_META = {
  bean: { label: "Coffee / bean", group: "context" },
  target_dose: { label: "Target dose", group: "recipe" },
  brew_water: { label: "Brew water", group: "recipe" },
  grinder: { label: "Grinder", group: "context" },
  grind_setting: { label: "Grind setting", group: "recipe" },
  target_yield: { label: "Target yield", group: "recipe" },
  brew_ratio: { label: "Brew ratio", group: "recipe" },
  target_time: { label: "Target brew time", group: "recipe" },
  brew_temperature: { label: "Brew temperature", group: "recipe" },
  preinfusion_time: { label: "Pre-infusion time", group: "advanced" },
  preinfusion_pressure: {
    label: "Pre-infusion pressure",
    group: "advanced",
  },
  bloom_time: { label: "Bloom time", group: "recipe" },
  target_pressure: { label: "Target brew pressure", group: "recipe" },
  target_flow_rate: { label: "Target flow rate", group: "advanced" },
  basket: { label: "Basket", group: "context" },
  puck_screen: { label: "Puck screen", group: "advanced" },
  paper_filter: { label: "Paper filter", group: "recipe" },
  distribution_method: { label: "Distribution method", group: "advanced" },
  tamp_force: { label: "Tamp force", group: "advanced" },
  accessories: { label: "Other equipment", group: "context" },
  notes: { label: "Preparation notes", group: "notes" },
} as const satisfies Record<
  RecipeFieldKey,
  { readonly label: string; readonly group: string }
>

export function isRecipeFieldKey(value: string): value is RecipeFieldKey {
  return RECIPE_FIELD_KEYS.some((key) => key === value)
}
