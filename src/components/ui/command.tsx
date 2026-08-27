'use client'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import { cn } from '@/lib/utils'

/**
 * A filterable command list. Pass `inline` so Base UI keeps the list open and
 * lets the surrounding dialog own the surface, backdrop, and dismissal.
 */
const Command = AutocompletePrimitive.Root

const CommandCollection = AutocompletePrimitive.Collection

function CommandInput({
  className,
  ...props
}: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input
      data-slot="command-input"
      className={cn(
        'h-11 w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:h-9 [@media(hover:hover)_and_(pointer:fine)]:text-sm',
        className,
      )}
      {...props}
    />
  )
}

function CommandList({
  className,
  ...props
}: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-[min(24rem,50dvh)] scroll-py-1 overflow-x-hidden overflow-y-auto p-2 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
        className,
      )}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: AutocompletePrimitive.Group.Props) {
  return (
    <AutocompletePrimitive.Group
      data-slot="command-group"
      className={cn('pb-1 last:pb-0', className)}
      {...props}
    />
  )
}

function CommandGroupLabel({
  className,
  ...props
}: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="command-group-label"
      className={cn(
        'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="command-item"
      // Items are reached with the arrow keys through the input, so an item
      // rendered as a link must not join the dialog's tab sequence.
      tabIndex={-1}
      className={cn(
        "flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground outline-hidden transition-colors duration-150 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:min-h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="command-empty"
      className={cn(
        'px-2 py-8 text-center text-sm text-muted-foreground empty:hidden',
        className,
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandCollection,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
}
