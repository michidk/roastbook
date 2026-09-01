'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, normalizeForComparison } from '@/lib/utils'

type CommandItemSearchProps = {
  value?: string
  keywords?: readonly string[]
}

type CommandContextValue = {
  query: string
}

const CommandContext = React.createContext<CommandContextValue>({ query: '' })

function getSearchValue({ value = '', keywords = [] }: CommandItemSearchProps) {
  return [value, ...keywords].join(' ')
}

function matchesSearchValue(itemValue: string, query: string) {
  const terms = normalizeForComparison(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true

  const haystack = normalizeForComparison(itemValue)
  return terms.every((term) => haystack.includes(term))
}

function Command({
  className,
  children,
  loop = false,
  ...props
}: React.ComponentProps<'div'> & { loop?: boolean }) {
  const [query, setQuery] = React.useState('')

  return (
    <CommandContext value={{ query }}>
      <ComboboxPrimitive.Root
        onInputValueChange={setQuery}
        inline
        open
        autoHighlight
        loopFocus={loop}
      >
        <div
          data-slot="command"
          className={cn(
            'flex min-h-0 w-full flex-col overflow-hidden bg-popover text-popover-foreground',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </ComboboxPrimitive.Root>
    </CommandContext>
  )
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn('overflow-hidden p-0', className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  onChange,
  onValueChange,
  ...props
}: ComboboxPrimitive.Input.Props & {
  onValueChange?: (value: string) => void
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="command-input"
      className={cn(
        'h-11 w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:h-9 [@media(hover:hover)_and_(pointer:fine)]:text-sm',
        className,
      )}
      onChange={(event) => {
        onChange?.(event)
        if (!event.defaultPrevented) onValueChange?.(event.currentTarget.value)
      }}
      {...props}
    />
  )
}

function CommandList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-[min(24rem,50dvh)] scroll-py-1 overflow-x-hidden overflow-y-auto p-2 outline-none [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&:has([data-slot=command-item])>[data-slot=command-empty]]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm', className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: ComboboxPrimitive.Group.Props & {
  heading?: React.ReactNode
}) {
  return (
    <ComboboxPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden pb-1 text-foreground last:pb-0 [&:not(:has([data-slot=command-item]))]:hidden',
        className,
      )}
      {...props}
    >
      {heading ? (
        <ComboboxPrimitive.GroupLabel
          data-slot="command-group-heading"
          className="px-2 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          {heading}
        </ComboboxPrimitive.GroupLabel>
      ) : null}
      {children}
    </ComboboxPrimitive.Group>
  )
}

function CommandItem({
  className,
  value = '',
  keywords = [],
  onClick,
  onSelect,
  ...props
}: Omit<ComboboxPrimitive.Item.Props, 'value'> &
  CommandItemSearchProps & {
    onSelect?: (value: string) => void
  }) {
  const { query } = React.use(CommandContext)
  const searchValue = getSearchValue({ value, keywords })
  if (!matchesSearchValue(searchValue, query)) return null

  return (
    <ComboboxPrimitive.Item
      data-slot="command-item"
      value={searchValue}
      className={cn(
        'flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground outline-hidden transition-colors duration-150 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:min-h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onSelect?.(value)
      }}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
}
