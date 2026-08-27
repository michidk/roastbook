import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCommandGroups,
  type CommandAction,
  type CommandActionGroup,
  matchesCommandQuery,
} from '@/components/command-palette-actions'
import { Button } from '@/components/ui/button'
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

/**
 * The palette is a keyboard shortcut for pointer-and-keyboard layouts, so it
 * matches the width at which the desktop header — and its trigger — appears.
 */
const DESKTOP_QUERY = '(min-width: 1024px)'

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/

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

  if (action.kind === 'navigate') {
    return (
      <CommandItem
        value={action}
        render={<Link to={action.to} />}
        onClick={() => onSelect(action)}
      >
        {content}
      </CommandItem>
    )
  }

  return (
    <CommandItem value={action} onClick={() => onSelect(action)}>
      {content}
    </CommandItem>
  )
}

/**
 * A desktop command palette: ⌘K or Ctrl+K opens a searchable list of every
 * navigation destination, create action, and theme choice. Navigation items are
 * real links, so they keep modifier-click behavior.
 */
export function CommandPalette({
  demoMode = false,
}: {
  readonly demoMode?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [shortcutHint, setShortcutHint] = useState('⌘ K')
  const inputRef = useRef<HTMLInputElement>(null)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const groups = useMemo(() => buildCommandGroups({ demoMode }), [demoMode])

  useEffect(() => {
    if (APPLE_PLATFORM_PATTERN.test(navigator.userAgent)) return
    setShortcutHint('Ctrl K')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'k' || event.altKey || event.shiftKey) return
      if (!event.metaKey && !event.ctrlKey) return
      if (!window.matchMedia(DESKTOP_QUERY).matches) return

      event.preventDefault()
      setIsOpen((open) => !open)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Narrowing past the desktop breakpoint hides the trigger, so the open
  // palette would otherwise be stranded on a layout that cannot reopen it.
  useEffect(() => {
    if (!isOpen) return

    const desktop = window.matchMedia(DESKTOP_QUERY)
    const closeWhenNarrow = () => {
      if (!desktop.matches) setIsOpen(false)
    }

    desktop.addEventListener('change', closeWhenNarrow)
    return () => desktop.removeEventListener('change', closeWhenNarrow)
  }, [isOpen])

  // Selecting an item fills the input with its label, so the query is cleared
  // after the close commits rather than during it.
  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  const handleSelect = (action: CommandAction) => {
    if (action.kind === 'theme') setTheme(action.theme)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Search pages and actions"
        aria-keyshortcuts="Meta+K Control+K"
        className="gap-2 font-normal text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Search />
        <span className="hidden xl:inline">Search</span>
        <span className="hidden xl:inline">
          <PaletteKey>{shortcutHint}</PaletteKey>
        </span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              <CommandEmpty>
                No page or action matches that search.
              </CommandEmpty>
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
                <PaletteKey>↵</PaletteKey>
                to open
              </span>
              <span className="flex items-center gap-1.5">
                <PaletteKey>esc</PaletteKey>
                to close
              </span>
            </DialogFooter>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
