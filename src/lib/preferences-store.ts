import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  COLLECTION_KEYS,
  type CollectionKey,
  type CollectionView,
  isCollectionView,
} from '@/lib/collection-view'

export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Browser' },
] as const satisfies readonly {
  readonly value: ThemePreference
  readonly label: string
}[]

type CollectionViews = Readonly<Partial<Record<CollectionKey, CollectionView>>>

type PreferencesState = {
  readonly theme: ThemePreference
  readonly collectionViews: CollectionViews
  readonly timerSoundsEnabled: boolean
  readonly hasHydrated: boolean
  readonly setTheme: (theme: ThemePreference) => void
  readonly setCollectionView: (
    collection: CollectionKey,
    view: CollectionView,
  ) => void
  readonly setTimerSoundsEnabled: (enabled: boolean) => void
  readonly markHydrated: () => void
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((theme) => theme.value === value)
}

function readTheme(state: object): ThemePreference | undefined {
  const theme = Reflect.get(state, 'theme')
  return isThemePreference(theme) ? theme : undefined
}

function readCollectionViews(state: object): CollectionViews {
  const stored = Reflect.get(state, 'collectionViews')
  if (typeof stored !== 'object' || stored === null) return {}

  const views: Partial<Record<CollectionKey, CollectionView>> = {}
  for (const collection of COLLECTION_KEYS) {
    const view = Reflect.get(stored, collection)
    if (isCollectionView(view)) views[collection] = view
  }
  return views
}

function readTimerSoundsEnabled(state: object): boolean {
  const enabled = Reflect.get(state, 'timerSoundsEnabled')
  return typeof enabled === 'boolean' ? enabled : true
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      collectionViews: {},
      timerSoundsEnabled: true,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setCollectionView: (collection, view) =>
        set((state) => ({
          collectionViews: { ...state.collectionViews, [collection]: view },
        })),
      setTimerSoundsEnabled: (timerSoundsEnabled) =>
        set({ timerSoundsEnabled }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      // Keep the existing key so current theme choices survive this migration.
      name: 'roastbook-settings',
      version: 6,
      skipHydration: true,
      partialize: ({ theme, collectionViews, timerSoundsEnabled }) => ({
        theme,
        collectionViews,
        timerSoundsEnabled,
      }),
      migrate: (persistedState) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return {
            theme: 'system',
            collectionViews: {},
            timerSoundsEnabled: true,
          }
        }
        return {
          theme: readTheme(persistedState) ?? 'system',
          collectionViews: readCollectionViews(persistedState),
          timerSoundsEnabled: readTimerSoundsEnabled(persistedState),
        }
      },
      merge: (persistedState, currentState) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return currentState
        }
        const theme = readTheme(persistedState)
        return {
          ...currentState,
          ...(theme ? { theme } : {}),
          collectionViews: readCollectionViews(persistedState),
          timerSoundsEnabled: readTimerSoundsEnabled(persistedState),
        }
      },
    },
  ),
)
