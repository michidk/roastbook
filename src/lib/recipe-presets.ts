import type { BrewingMethod } from "@/lib/recipes"
import type { RecipeFieldKey, RecipeValues } from "@/lib/recipe-fields"

export type RecipePreset = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly brewingMethod: Exclude<BrewingMethod, "other">
  readonly enabledFields: readonly RecipeFieldKey[]
  readonly values: Readonly<Partial<RecipeValues>>
}

export const BEGINNER_RECIPE_PRESETS = [
  {
    id: "beginner-espresso",
    name: "Beginner Espresso 1:2",
    description: "A forgiving double-shot starting point.",
    brewingMethod: "espresso",
    enabledFields: [
      "bean", "target_dose", "grinder", "grind_setting", "target_yield",
      "brew_ratio", "target_time", "brew_temperature", "target_pressure",
      "basket", "notes",
    ],
    values: {
      targetDoseGrams: "18.00",
      targetYieldGrams: "36.00",
      ratioBasis: "target_yield",
      targetTimeMinSeconds: "25.00",
      targetTimeMaxSeconds: "30.00",
      brewTemperatureCelsius: "93.0",
      targetBrewPressureBar: "9.00",
    },
  },
  {
    id: "beginner-pourover",
    name: "Beginner Pour-over",
    description: "A balanced V60-style single cup.",
    brewingMethod: "pourover",
    enabledFields: [
      "bean", "target_dose", "brew_water", "grinder", "grind_setting",
      "brew_ratio", "target_time", "brew_temperature", "bloom_time",
      "paper_filter", "notes",
    ],
    values: {
      targetDoseGrams: "15.00",
      brewWaterGrams: "250.00",
      ratioBasis: "brew_water",
      targetTimeMinSeconds: "165.00",
      targetTimeMaxSeconds: "195.00",
      brewTemperatureCelsius: "94.0",
      bloomTimeSeconds: "40.00",
      paperFilterPosition: "bottom",
    },
  },
  {
    id: "beginner-aeropress",
    name: "Beginner AeroPress",
    description: "A clean, full-bodied standard method.",
    brewingMethod: "aeropress",
    enabledFields: [
      "bean", "target_dose", "brew_water", "grinder", "grind_setting",
      "brew_ratio", "target_time", "brew_temperature", "paper_filter", "notes",
    ],
    values: {
      targetDoseGrams: "17.00",
      brewWaterGrams: "220.00",
      ratioBasis: "brew_water",
      targetTimeMinSeconds: "105.00",
      targetTimeMaxSeconds: "120.00",
      brewTemperatureCelsius: "93.0",
      paperFilterPosition: "bottom",
    },
  },
  {
    id: "beginner-french-press",
    name: "Beginner French Press",
    description: "A simple four-minute immersion brew.",
    brewingMethod: "french_press",
    enabledFields: [
      "bean", "target_dose", "brew_water", "grinder", "grind_setting",
      "brew_ratio", "target_time", "brew_temperature", "notes",
    ],
    values: {
      targetDoseGrams: "30.00",
      brewWaterGrams: "450.00",
      ratioBasis: "brew_water",
      targetTimeMinSeconds: "240.00",
      targetTimeMaxSeconds: "240.00",
      brewTemperatureCelsius: "93.0",
    },
  },
  {
    id: "beginner-moka-pot",
    name: "Beginner Moka Pot",
    description: "Adapt the amounts to your pot size.",
    brewingMethod: "moka_pot",
    enabledFields: [
      "bean", "target_dose", "brew_water", "grinder", "grind_setting",
      "brew_ratio", "target_time", "notes",
    ],
    values: {
      ratioBasis: "brew_water",
      targetTimeMinSeconds: "180.00",
      targetTimeMaxSeconds: "360.00",
      notes: "Fill the basket loosely, add water just below the safety valve, never tamp, and remove from heat when extraction completes.",
    },
  },
  {
    id: "beginner-cold-brew",
    name: "Beginner Cold Brew Concentrate",
    description: "A reliable overnight concentrate.",
    brewingMethod: "cold_brew",
    enabledFields: [
      "bean", "target_dose", "brew_water", "grinder", "grind_setting",
      "brew_ratio", "target_time", "notes",
    ],
    values: {
      targetDoseGrams: "100.00",
      brewWaterGrams: "500.00",
      ratioBasis: "brew_water",
      targetTimeMinSeconds: "43200.00",
      targetTimeMaxSeconds: "43200.00",
      grindSetting: "Coarse",
      notes: "Steep covered at room temperature or cooler for 12 hours, then filter and dilute to taste.",
    },
  },
] as const satisfies readonly RecipePreset[]

export function getRecipePreset(id: string): RecipePreset | undefined {
  return BEGINNER_RECIPE_PRESETS.find((preset) => preset.id === id)
}
