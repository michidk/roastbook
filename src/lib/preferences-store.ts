import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Browser' },
] as const satisfies readonly {
  readonly value: ThemePreference
  readonly label: string
}[]

type PreferencesState = {
  readonly theme: ThemePreference
  readonly hasHydrated: boolean
  readonly setTheme: (theme: ThemePreference) => void
  readonly markHydrated: () => void
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((theme) => theme.value === value)
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      // Keep the existing key so current theme choices survive this migration.
      name: 'roastbook-settings',
      version: 4,
      skipHydration: true,
      partialize: ({ theme }) => ({ theme }),
      migrate: (persistedState) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return { theme: 'system' }
        }
        const theme = Reflect.get(persistedState, 'theme')
        return { theme: isThemePreference(theme) ? theme : 'system' }
      },
      merge: (persistedState, currentState) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return currentState
        }
        const theme = Reflect.get(persistedState, 'theme')
        return {
          ...currentState,
          ...(isThemePreference(theme) ? { theme } : {}),
        }
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
)
