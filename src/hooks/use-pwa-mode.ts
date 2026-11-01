import { useSyncExternalStore } from 'react'
import { DEMO_MODE } from '@/lib/build-mode'
import { isStandalone } from '@/lib/standalone'

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(display-mode: standalone)')
  media.addEventListener('change', onChange)
  window.addEventListener('pageshow', onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener('pageshow', onChange)
  }
}

export function usePwaMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !DEMO_MODE && isStandalone(),
    () => false,
  )
}
