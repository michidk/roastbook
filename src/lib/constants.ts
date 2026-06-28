export const ROAST_LEVELS = [
  { value: "light", label: "Light" },
  { value: "medium_light", label: "Medium Light" },
  { value: "medium", label: "Medium" },
  { value: "medium_dark", label: "Medium Dark" },
  { value: "dark", label: "Dark" },
] as const

export type RoastLevel = (typeof ROAST_LEVELS)[number]["value"]

export const PROCESS_METHODS = [
  { value: "washed", label: "Washed" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "anaerobic", label: "Anaerobic" },
  { value: "wet_hulled", label: "Wet Hulled" },
  { value: "carbonic_maceration", label: "Carbonic Maceration" },
  { value: "other", label: "Other" },
] as const



export const GEAR_TYPES = [
  { value: "espresso_machine", label: "Espresso Machine" },
  { value: "grinder", label: "Grinder" },
  { value: "kettle", label: "Kettle" },
  { value: "scale", label: "Scale" },
  { value: "tamper", label: "Tamper" },
  { value: "wdt", label: "WDT Tool" },
  { value: "other", label: "Other" },
] as const

export type GearType = (typeof GEAR_TYPES)[number]["value"]

export const GEAR_TYPE_LABELS: Record<GearType, string> = Object.fromEntries(
  GEAR_TYPES.map((t) => [t.value, t.label])
) as Record<GearType, string>

export const DRINK_TYPES = [
  "Espresso",
  "Doppio",
  "Ristretto",
  "Lungo",
  "Americano",
  "Latte",
  "Cappuccino",
  "Flat White",
  "Cortado",
  "Macchiato",
  "Mocha",
  "Pour Over",
  "Filter",
  "Cold Brew",
  "Iced Coffee",
  "Other",
] as const

