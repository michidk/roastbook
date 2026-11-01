import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  isConnectionOnline,
  subscribeToConnection,
} from '@/lib/connection-status'
import { startRecipeReplication } from '@/modules/rxdb/replication'

/** Replication supplies remote changes. All local writes use the journal operation log. */
export function OfflineRxdbManager() {
  const router = useRouter()
  useEffect(() => {
    let disposed = false
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let unsubscribe = () => {}
    void startRecipeReplication()
      .then((replication) => {
        if (disposed) return
        const subscription = replication.received$.subscribe(() => {
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => {
            if (!disposed && isConnectionOnline())
              void router.invalidate().catch(() => undefined)
          }, 250)
        })
        const reconnect = subscribeToConnection(() => {
          if (isConnectionOnline()) replication.reSync()
        })
        unsubscribe = () => {
          subscription.unsubscribe()
          reconnect()
        }
      })
      .catch((error) => {
        console.error('Could not start recipe synchronization', error)
      })
    return () => {
      disposed = true
      unsubscribe()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [router])
  return null
}
