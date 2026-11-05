import { Toaster as SharedToaster } from '@roastbook/ui/sonner'
import type { ComponentProps } from 'react'
import { usePreferencesStore } from '@/lib/preferences-store'

export function Toaster(props: ComponentProps<typeof SharedToaster>) {
  const theme = usePreferencesStore((state) => state.theme)
  return <SharedToaster theme={theme} {...props} />
}
