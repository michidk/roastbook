import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { isStandalone } from '@/lib/standalone'

const UPDATE_TOAST_ID = 'pwa-update'

export function PwaManager() {
  const updateRequestedRef = useRef(false)

  useEffect(() => {
    if (import.meta.env.DEV) return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let cancelled = false

    const showUpdate = (worker: ServiceWorker | null) => {
      if (!worker || cancelled) return

      // A browser tab reloads on its own; only the installed app needs a prompt.
      if (!isStandalone()) {
        worker.postMessage({ type: 'SKIP_WAITING' })
        return
      }

      toast('A new version of Roastbook is available', {
        id: UPDATE_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        dismissible: true,
        action: {
          label: 'Reload',
          onClick: () => {
            updateRequestedRef.current = true
            worker.postMessage({ type: 'SKIP_WAITING' })
          },
        },
      })
    }

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) showUpdate(registration.waiting)

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            showUpdate(registration.waiting)
          }
        })
      })
    }

    const handleControllerChange = () => {
      if (!updateRequestedRef.current) {
        toast.dismiss(UPDATE_TOAST_ID)
        return
      }
      updateRequestedRef.current = false
      window.location.reload()
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(watchRegistration)
        .catch((error) => {
          console.error('Service worker registration failed', error)
        })
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    )

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
      window.removeEventListener('load', register)
      toast.dismiss(UPDATE_TOAST_ID)
    }
  }, [])

  return null
}
