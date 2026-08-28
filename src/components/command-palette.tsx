import { lazy, Suspense, useEffect, useState } from 'react'
import { isCommandPaletteShortcut } from '@/lib/command-palette-shortcut'

const CommandPaletteDialog = lazy(() =>
  import('@/components/command-palette-dialog').then((module) => ({
    default: module.CommandPaletteDialog,
  })),
)

/** A lightweight global shortcut that defers the dialog until first use. */
export function CommandPalette({
  demoMode = false,
}: {
  readonly demoMode?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  const setOpen = (open: boolean) => {
    if (open) setHasOpened(true)
    setIsOpen(open)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCommandPaletteShortcut(event)) return

      event.preventDefault()
      setHasOpened(true)
      setIsOpen((open) => !open)
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  if (!hasOpened) return null

  return (
    <Suspense fallback={null}>
      <CommandPaletteDialog
        demoMode={demoMode}
        open={isOpen}
        onOpenChange={setOpen}
      />
    </Suspense>
  )
}
