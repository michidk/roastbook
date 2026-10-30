import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePreferencesStore } from '@/lib/preferences-store'
import { isStandalone } from '@/lib/standalone'

// Chromium-only event; not in the DOM typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function InstallAppHint() {
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)
  const dismissed = usePreferencesStore((state) => state.installHintDismissed)
  const dismiss = usePreferencesStore((state) => state.dismissInstallHint)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    // iOS Safari has no install prompt API, so explain the manual step instead.
    setShowIosHint(isIos())

    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (!hasHydrated || dismissed || (!installPrompt && !showIosHint)) {
    return null
  }

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    // A prompt event can only be used once.
    setInstallPrompt(null)
    if (outcome === 'accepted') dismiss()
  }

  return (
    <div className="border-b border-border bg-secondary/60 px-4 py-2.5 text-secondary-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <img
          src="/logo192.png"
          alt=""
          className="size-10 shrink-0 rounded-xl border border-border shadow-control"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display text-sm font-bold">Install Roastbook</p>
          <p className="text-xs text-muted-foreground">
            {installPrompt
              ? 'Use it offline, right from your home screen.'
              : 'Tap Share, then Add to Home Screen to use it offline.'}
          </p>
        </div>
        {installPrompt ? (
          <Button size="sm" onClick={() => void install()}>
            <Download aria-hidden="true" />
            Install
          </Button>
        ) : null}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Dismiss install hint"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
