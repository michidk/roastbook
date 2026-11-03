import { useSyncExternalStore } from 'react'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  isConnectionOnline,
  subscribeToConnection,
} from '@/lib/connection-status'

export function useOnlineStatus(): boolean {
  const online = useSyncExternalStore(
    subscribeToConnection,
    isConnectionOnline,
    () => true,
  )
  return DEMO_MODE || online
}
