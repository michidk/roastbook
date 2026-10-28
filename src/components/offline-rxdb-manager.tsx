import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useState } from 'react'
import { getRecipeCollection } from '@/modules/rxdb/recipes'
import { startRecipeReplication } from '@/modules/rxdb/replication'

export function OfflineRxdbManager() {
  const [collection, setCollection] =
    useState<Awaited<ReturnType<typeof getRecipeCollection>>>()

  useEffect(() => {
    let cancelled = false
    void Promise.all([getRecipeCollection(), startRecipeReplication()])
      .then(([nextCollection]) => {
        if (!cancelled) setCollection(nextCollection)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return collection ? (
    <OfflineRecipeCollectionObserver collection={collection} />
  ) : null
}

function OfflineRecipeCollectionObserver({
  collection,
}: {
  readonly collection: Awaited<ReturnType<typeof getRecipeCollection>>
}) {
  const { data: recipes = [] } = useLiveQuery(collection)
  return (
    <span
      className="sr-only"
      aria-hidden="true"
      data-offline-recipe-count={recipes.length}
    />
  )
}
