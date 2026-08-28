import { Link, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  buildCommandGroups,
  buildEntityCommandGroups,
  type CommandAction,
} from '@/components/command-palette-actions'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  COMMAND_ENTITY_SEARCH_MIN_LENGTH,
  type CommandEntitySearchResults,
} from '@/lib/command-search-contract'
import { usePreferencesStore } from '@/lib/preferences-store'
import { searchCommandEntities } from '@/lib/server/command-search'

const EMPTY_ENTITY_RESULTS: CommandEntitySearchResults = {
  beans: [],
  cafes: [],
  gear: [],
}

function PaletteKey({ children }: { readonly children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[11px] leading-4 font-semibold text-muted-foreground">
      {children}
    </kbd>
  )
}

function ActionContent({ action }: { readonly action: CommandAction }) {
  return (
    <>
      <action.icon className="text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{action.label}</span>
        {action.description ? (
          <span className="block truncate text-xs text-muted-foreground">
            {action.description}
          </span>
        ) : null}
      </span>
    </>
  )
}

function CommandActionItem({
  action,
  onSelect,
}: {
  readonly action: CommandAction
  readonly onSelect: (action: CommandAction) => void
}) {
  return (
    <CommandItem
      value={action.value}
      keywords={[action.label, ...action.keywords]}
      className="min-h-11 gap-2.5 py-2 [@media(hover:hover)_and_(pointer:fine)]:min-h-9"
      onSelect={() => onSelect(action)}
    >
      {action.kind === 'navigate' ? (
        <Link
          to={action.to}
          tabIndex={-1}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <ActionContent action={action} />
        </Link>
      ) : (
        <ActionContent action={action} />
      )}
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
  const [entityResults, setEntityResults] = useState(EMPTY_ENTITY_RESULTS)
  const [entitySearchState, setEntitySearchState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const navigate = useNavigate()
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const groups = useMemo(
    () => [
      ...buildEntityCommandGroups(entityResults),
      ...buildCommandGroups({ demoMode }),
    ],
    [demoMode, entityResults],
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setEntityResults(EMPTY_ENTITY_RESULTS)
      setEntitySearchState('idle')
    }
  }, [open])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!open || trimmedQuery.length < COMMAND_ENTITY_SEARCH_MIN_LENGTH) {
      setEntityResults(EMPTY_ENTITY_RESULTS)
      setEntitySearchState('idle')
      return
    }

    let ignoreResult = false
    setEntityResults(EMPTY_ENTITY_RESULTS)
    setEntitySearchState('loading')
    const timeout = window.setTimeout(() => {
      searchCommandEntities({ data: { query: trimmedQuery } })
        .then((results) => {
          if (ignoreResult) return
          setEntityResults(results)
          setEntitySearchState('ready')
        })
        .catch(() => {
          if (ignoreResult) return
          setEntitySearchState('error')
        })
    }, 200)

    return () => {
      ignoreResult = true
      window.clearTimeout(timeout)
    }
  }, [open, query])

  const handleSelect = (action: CommandAction) => {
    if (action.kind === 'navigate') void navigate({ to: action.to })
    if (action.kind === 'theme') setTheme(action.theme)
    onOpenChange(false)
  }

  return (
    <CommandDialog
      title="Command palette"
      description="Search Roastbook beans, cafés, gear, pages, and actions, then press Enter to open the highlighted result."
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-xl"
    >
      <Command loop>
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          aria-label="Search beans, cafés, gear, pages, and actions"
          placeholder="Search beans, cafés, gear, pages…"
        />
        <CommandList
          aria-busy={entitySearchState === 'loading'}
          className="max-h-[min(24rem,50dvh)] p-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
        >
          <CommandEmpty className="text-muted-foreground">
            {entitySearchState === 'loading'
              ? 'Searching beans, cafés, and gear…'
              : entitySearchState === 'error'
                ? 'Entity search is unavailable. Try again.'
                : 'No bean, café, gear, page, or action matches that search.'}
          </CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((action) => (
                <CommandActionItem
                  key={action.value}
                  action={action}
                  onSelect={handleSelect}
                />
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex flex-row justify-center gap-4 border-t border-border/70 bg-muted/35 px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <PaletteKey>↑</PaletteKey>
            <PaletteKey>↓</PaletteKey>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <PaletteKey>esc</PaletteKey>
            to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}
