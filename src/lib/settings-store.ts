import { create } from "zustand"
import { persist } from "zustand/middleware"
import { CURRENCIES } from "@/lib/constants"

export type Currency = (typeof CURRENCIES)[number]["value"]
export type ThemePreference = "light" | "dark" | "system"
export type DefaultMapLocation = {
  readonly latitude: number
  readonly longitude: number
  readonly label: string
}

export const DEFAULT_MAP_LOCATION = {
  latitude: 52.52,
  longitude: 13.405,
  label: "Berlin",
} as const satisfies DefaultMapLocation

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Browser" },
] as const satisfies readonly {
  readonly value: ThemePreference
  readonly label: string
}[]

type SettingsState = {
  readonly defaultCurrency: Currency
  readonly defaultMapLocation: DefaultMapLocation | null
  readonly theme: ThemePreference
  readonly hasHydrated: boolean
  readonly setDefaultCurrency: (currency: Currency) => void
  readonly setDefaultMapLocation: (location: DefaultMapLocation | null) => void
  readonly setTheme: (theme: ThemePreference) => void
  readonly markHydrated: () => void
}

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.some((currency) => currency.value === value)
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((theme) => theme.value === value)
}

function isDefaultMapLocation(
  value: unknown,
): value is DefaultMapLocation {
  if (typeof value !== "object" || value === null) return false
  const latitude = Reflect.get(value, "latitude")
  const longitude = Reflect.get(value, "longitude")
  const label = Reflect.get(value, "label")
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180 &&
    typeof label === "string" &&
    label.trim().length > 0
  )
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultCurrency: "EUR",
      defaultMapLocation: null,
      theme: "system",
      hasHydrated: false,
      setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
      setDefaultMapLocation: (defaultMapLocation) => set({ defaultMapLocation }),
      setTheme: (theme) => set({ theme }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "roastbook-settings",
      version: 1,
      skipHydration: true,
      partialize: ({ defaultCurrency, defaultMapLocation, theme }) => ({
        defaultCurrency,
        defaultMapLocation,
        theme,
      }),
      merge: (persistedState, currentState) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return currentState
        }

        const defaultCurrency = Reflect.get(persistedState, "defaultCurrency")
        const defaultMapLocation = Reflect.get(
          persistedState,
          "defaultMapLocation",
        )
        const theme = Reflect.get(persistedState, "theme")

        return {
          ...currentState,
          ...(isCurrency(defaultCurrency) ? { defaultCurrency } : {}),
          ...(isDefaultMapLocation(defaultMapLocation)
            ? { defaultMapLocation }
            : {}),
          ...(isThemePreference(theme) ? { theme } : {}),
        }
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
)
