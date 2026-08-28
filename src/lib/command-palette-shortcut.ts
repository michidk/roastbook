type CommandPaletteKeyEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'repeat' | 'shiftKey'
>

/** Recognizes Cmd/Ctrl-K without depending on the active keyboard layout. */
export function isCommandPaletteShortcut(
  event: CommandPaletteKeyEvent,
): boolean {
  const isK = event.code === 'KeyK' || event.key.toLocaleLowerCase() === 'k'
  return (
    isK &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat
  )
}
