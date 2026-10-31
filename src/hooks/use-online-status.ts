import { useSyncExternalStore } from 'react'
import {
  isConnectionOnline,
  subscribeToConnection,
} from '@/lib/connection-status'

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    isConnectionOnline,
    () => true,
  )
}
