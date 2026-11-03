import { useRouter } from '@tanstack/react-router'
import { HardDrive, RotateCcw } from 'lucide-react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import { resetBrowserDemo } from '@/lib/demo/local/client'
import { usePreferencesStore } from '@/lib/preferences-store'

export function DemoNotice() {
  const router = useRouter()
  return (
    <aside
      aria-label="Browser demo"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
        <p className="flex min-w-0 flex-1 items-start gap-2">
          <HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Temporary demo. Changes and pictures stay in this browser only,
            without backup or device sync, and can be lost if site storage is
            cleared. Do not use this demo for data you need to keep.{' '}
            <a
              href="https://app.roastbook.coffee"
              className="underline underline-offset-4 font-medium"
            >
              Sign up for Roastbook
            </a>{' '}
            for the full experience and a permanent account to keep your journal
            safely beyond this browser. Integrations are unavailable here.
          </span>
        </p>
        <DeleteConfirmation
          title="Reset this browser’s demo?"
          description="This permanently removes your demo edits, added pictures, and appearance settings, then restores the sample journal. Other journals and accounts are unaffected."
          confirmLabel="Reset demo"
          busyLabel="Resetting…"
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw aria-hidden className="mr-2 size-4" />
              Reset demo
            </Button>
          }
          onConfirm={async () => {
            await resetBrowserDemo()
            usePreferencesStore.setState({
              theme: 'system',
              collectionViews: {},
              timerSoundsEnabled: true,
              installHintDismissed: false,
            })
            await router.navigate({ to: '/overview' })
            await router.invalidate()
          }}
        />
      </div>
    </aside>
  )
}
