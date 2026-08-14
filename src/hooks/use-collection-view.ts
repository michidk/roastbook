import { useAppSettings } from '@/hooks/use-app-settings'
import type { CollectionKey, CollectionView } from '@/lib/collection-view'
import { usePreferencesStore } from '@/lib/preferences-store'

type UseCollectionViewResult = {
  readonly view: CollectionView
  readonly setView: (view: CollectionView) => void
  /** False until the persisted browser preferences have rehydrated. */
  readonly isReady: boolean
}

/**
 * Resolves the view for one collection: the last choice made in this browser
 * wins, otherwise the installation-wide default from the settings table. The
 * saved default is used during SSR and the first paint so the server-rendered
 * markup always matches.
 */
export function useCollectionView(
  collection: CollectionKey,
): UseCollectionViewResult {
  const { defaultListView } = useAppSettings()
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)
  const storedView = usePreferencesStore(
    (state) => state.collectionViews[collection],
  )
  const setCollectionView = usePreferencesStore(
    (state) => state.setCollectionView,
  )

  return {
    view: hasHydrated ? (storedView ?? defaultListView) : defaultListView,
    setView: (view) => setCollectionView(collection, view),
    isReady: hasHydrated,
  }
}
