import type { HTMLAttributes, SyntheticEvent } from 'react'

import { cn } from '@/lib/utils'

function stopMapInteraction(event: SyntheticEvent) {
  event.stopPropagation()
}

/** Keeps controls usable without their pointer and wheel events reaching the map. */
export function MapControlContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    // This wrapper has no action of its own; handlers only keep pointer events
    // from bubbling into the interactive map below it.
    // biome-ignore lint/a11y/noStaticElementInteractions: event boundary, not an interactive control
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events stay on the semantic child buttons
    <div
      data-slot="map-control-container"
      className={cn('pointer-events-auto', className)}
      {...props}
      onClick={stopMapInteraction}
      onContextMenu={stopMapInteraction}
      onDoubleClick={stopMapInteraction}
      onPointerDown={stopMapInteraction}
      onTouchStart={stopMapInteraction}
      onWheel={stopMapInteraction}
    />
  )
}
