import { Search } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const CommandPaletteDialog = lazy(() =>
  import('@/components/command-palette-dialog').then((module) => ({
    default: module.CommandPaletteDialog,
  })),
)

const DESKTOP_QUERY = '(min-width: 1024px)'
const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/

function PaletteKey({ children }: { readonly children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-border bg-secondary px-1.5 py-0.5 font-sans text-[11px] leading-4 font-semibold text-muted-foreground">
      {children}
    </kbd>
  )
}

/** A lightweight trigger that defers the searchable dialog until first use. */
export function CommandPalette({
  demoMode = false,
}: {
  readonly demoMode?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [shortcutHint, setShortcutHint] = useState('⌘ K')

  const setOpen = (open: boolean) => {
    if (open) setHasOpened(true)
    setIsOpen(open)
  }

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
      setIsOpen((open) => {
        if (!open) setHasOpened(true)
        return !open
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const closeWhenNarrow = () => {
      if (!desktop.matches) setIsOpen(false)
    }
    desktop.addEventListener('change', closeWhenNarrow)
    return () => desktop.removeEventListener('change', closeWhenNarrow)
  }, [isOpen])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Search beans, cafés, gear, pages, and actions"
        aria-keyshortcuts="Meta+K Control+K"
        className="gap-2 pr-2 pl-3 font-normal text-muted-foreground hover:text-foreground xl:pr-1.5"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden xl:inline">Search</span>
        <span className="hidden xl:inline">
          <PaletteKey>{shortcutHint}</PaletteKey>
        </span>
      </Button>

      {hasOpened ? (
        <Suspense fallback={null}>
          <CommandPaletteDialog
            demoMode={demoMode}
            open={isOpen}
            onOpenChange={setOpen}
          />
        </Suspense>
      ) : null}
    </>
  )
}
