import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function PageHelp({
  children,
  ariaLabel = 'About this page',
}: {
  readonly children: ReactNode
  readonly ariaLabel?: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={ariaLabel}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:size-11"
        openOnHover
        delay={0}
        closeDelay={100}
      >
        <CircleHelp aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent
        className="w-72 text-sm leading-relaxed text-muted-foreground"
        side="bottom"
        sideOffset={6}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
