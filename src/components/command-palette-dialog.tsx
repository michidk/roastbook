import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCommandGroups,
  type CommandAction,
  type CommandActionGroup,
  matchesCommandQuery,
} from '@/components/command-palette-actions'
import {
  Command,
  CommandCollection,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePreferencesStore } from '@/lib/preferences-store'

function PaletteKey({ children }: { readonly children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[11px] leading-4 font-semibold text-muted-foreground">
      {children}
    </kbd>
  )
}

function CommandActionItem({
  action,
  onSelect,
}: {
  readonly action: CommandAction
  readonly onSelect: (action: CommandAction) => void
}) {
  const content = (
    <>
      <action.icon className="text-muted-foreground" />
      {action.label}
    </>
  )

  return action.kind === 'navigate' ? (
    <CommandItem
      value={action}
      render={<Link to={action.to} />}
      onClick={() => onSelect(action)}
    >
      {content}
    </CommandItem>
  ) : (
    <CommandItem value={action} onClick={() => onSelect(action)}>
      {content}
    </CommandItem>
  )
}

export function CommandPaletteDialog({
  demoMode,
  open,
  onOpenChange,
}: {
  readonly demoMode: boolean
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const groups = useMemo(() => buildCommandGroups({ demoMode }), [demoMode])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (action: CommandAction) => {
    if (action.kind === 'theme') setTheme(action.theme)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" initialFocus={inputRef}>
        <Command
          items={groups}
          filter={matchesCommandQuery}
          value={query}
          onValueChange={setQuery}
          autoHighlight="always"
          inline
          open
        >
          <DialogHeader className="gap-0 py-4 sm:py-4">
            <DialogTitle className="sr-only">Command palette</DialogTitle>
            <DialogDescription className="sr-only">
              Search Roastbook pages and actions, then press Enter to run the
              highlighted result.
            </DialogDescription>
            <div className="flex items-center gap-2.5">
              <Search
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <CommandInput
                ref={inputRef}
                aria-label="Search pages and actions"
                placeholder="Search pages and actions…"
              />
            </div>
          </DialogHeader>

          <div data-slot="dialog-body" className="min-h-0">
            <CommandEmpty>No page or action matches that search.</CommandEmpty>
            <CommandList>
              {(group: CommandActionGroup) => (
                <CommandGroup key={group.label} items={group.items}>
                  <CommandGroupLabel>{group.label}</CommandGroupLabel>
                  <CommandCollection>
                    {(action: CommandAction) => (
                      <CommandActionItem
                        key={action.value}
                        action={action}
                        onSelect={handleSelect}
                      />
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </div>

          <DialogFooter className="flex-row justify-center gap-4 py-3 text-xs text-muted-foreground sm:justify-center">
            <span className="flex items-center gap-1.5">
              <PaletteKey>↑</PaletteKey>
              <PaletteKey>↓</PaletteKey>
              to move
            </span>
            <span className="flex items-center gap-1.5">
              <PaletteKey>esc</PaletteKey>
              to close
            </span>
          </DialogFooter>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
