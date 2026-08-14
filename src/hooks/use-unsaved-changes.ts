import { useBlocker } from '@tanstack/react-router'

export function useUnsavedChanges(
  shouldBlock: boolean,
  message = 'Discard your unsaved changes?',
): void {
  useBlocker({
    enableBeforeUnload: shouldBlock,
    shouldBlockFn: () => !window.confirm(message),
    disabled: !shouldBlock,
  })
}
