import { Link, useLocation } from '@tanstack/react-router'
import { CloudOff } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  SectionLayout,
  type SectionNavigationItem,
} from '@/components/section-layout'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePwaMode } from '@/hooks/use-pwa-mode'

export function SettingsShell({
  sections,
  children,
}: {
  readonly sections: readonly SectionNavigationItem[]
  readonly children: ReactNode
}) {
  const { pathname } = useLocation()
  const isOnline = useOnlineStatus()
  const isPwa = usePwaMode()
  const disableServerControls =
    !isOnline &&
    pathname !== '/settings/appearance' &&
    pathname !== '/settings/offline'

  return (
    <SectionLayout label="Settings" sections={sections}>
      {!isOnline ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-secondary/45 p-3 text-sm"
        >
          <CloudOff className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">You’re offline</p>
            <p className="text-muted-foreground">
              Server-backed settings are read-only. The browser theme and{' '}
              {isPwa ? (
                <Link
                  to="/settings/offline"
                  className="font-semibold text-link underline underline-offset-2"
                >
                  PWA settings
                </Link>
              ) : (
                'cached data'
              )}{' '}
              remain available.
            </p>
          </div>
        </div>
      ) : null}
      <fieldset
        disabled={disableServerControls}
        className="m-0 min-w-0 divide-y divide-border border-0 p-0"
      >
        {children}
      </fieldset>
    </SectionLayout>
  )
}
