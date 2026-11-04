import { useRouter } from '@tanstack/react-router'
import { HardDrive, RotateCcw } from 'lucide-react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import { usePreferencesStore } from '@/lib/preferences-store'
import { resetDemoJournal } from '../edition'

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
            Temporary demo. Data stays in this browser only, without backup or
            sync. Clearing site storage deletes it.{' '}
            <a
              href="https://app.roastbook.coffee"
              className="underline underline-offset-4 font-medium"
            >
              Sign up for Roastbook
            </a>{' '}
            for the full experience and permanent storage.
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
            await resetDemoJournal()
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
