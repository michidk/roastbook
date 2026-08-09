import { create } from "zustand"
import { persist } from "zustand/middleware"
import { CURRENCIES } from "@/lib/constants"

export type Currency = (typeof CURRENCIES)[number]["value"]
export type ThemePreference = "light" | "dark" | "system"

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
  readonly theme: ThemePreference
  readonly hasHydrated: boolean
  readonly setDefaultCurrency: (currency: Currency) => void
  readonly setTheme: (theme: ThemePreference) => void
  readonly markHydrated: () => void
}

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.some((currency) => currency.value === value)
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((theme) => theme.value === value)
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultCurrency: "EUR",
      theme: "system",
      hasHydrated: false,
      setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
      setTheme: (theme) => set({ theme }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "roastbook-settings",
      version: 1,
      skipHydration: true,
      partialize: ({ defaultCurrency, theme }) => ({ defaultCurrency, theme }),
      merge: (persistedState, currentState) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return currentState
        }

        const defaultCurrency = Reflect.get(persistedState, "defaultCurrency")
        const theme = Reflect.get(persistedState, "theme")

        return {
          ...currentState,
          ...(isCurrency(defaultCurrency) ? { defaultCurrency } : {}),
          ...(isThemePreference(theme) ? { theme } : {}),
        }
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
)
