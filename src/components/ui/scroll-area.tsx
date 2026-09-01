import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@/lib/utils'

function ScrollArea({
  className,
  children,
  viewportClassName,
  viewportProps,
  orientation = 'vertical',
  type,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  viewportClassName?: string
  viewportProps?: ScrollAreaPrimitive.Viewport.Props
  orientation?: 'vertical' | 'horizontal' | 'both'
  type?: 'auto' | 'always' | 'scroll' | 'hover'
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn('size-full rounded-[inherit]', viewportClassName)}
        {...viewportProps}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== 'horizontal' && (
        <ScrollBar keepMounted={type === 'always'} />
      )}
      {orientation !== 'vertical' && (
        <ScrollBar orientation="horizontal" keepMounted={type === 'always'} />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-px transition-colors',
        orientation === 'vertical' &&
          'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' &&
          'h-2.5 flex-col border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
