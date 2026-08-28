import type { ReactNode } from 'react'
import { PageHelp } from '@/components/page-help'

export function AiActionHelp({ children }: { readonly children: ReactNode }) {
  return <PageHelp ariaLabel="About this AI action">{children}</PageHelp>
}
