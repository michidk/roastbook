import { useLocation } from '@tanstack/react-router'
import { CloudOff } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  SectionLayout,
  type SectionNavigationItem,
} from '@/components/section-layout'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function SettingsShell({
  sections,
  children,
}: {
  readonly sections: readonly SectionNavigationItem[]
  readonly children: ReactNode
}) {
  const { pathname } = useLocation()
  const isOnline = useOnlineStatus()
  const disableServerControls =
    !isOnline &&
    ![
      '/settings',
      '/settings/appearance',
      '/settings/offline',
      '/settings/map',
      '/settings/drinks',
      '/settings/taste-profile',
    ].includes(pathname)

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
              Journal settings remain editable and save on this device. Account
              and integration settings need a connection.
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
