export const BREWING_METHOD_OPTIONS = [
  { value: "espresso", label: "Espresso" },
  { value: "pourover", label: "Pour over" },
  { value: "aeropress", label: "AeroPress" },
  { value: "french_press", label: "French press" },
  { value: "moka_pot", label: "Moka pot" },
  { value: "cold_brew", label: "Cold brew" },
  { value: "other", label: "Other" },
] as const

export type BrewingMethod = (typeof BREWING_METHOD_OPTIONS)[number]["value"]

export const BREWING_METHOD_LABELS = {
  espresso: "Espresso",
  pourover: "Pour over",
  aeropress: "AeroPress",
  french_press: "French press",
  moka_pot: "Moka pot",
  cold_brew: "Cold brew",
  other: "Other",
} as const satisfies Record<BrewingMethod, string>
