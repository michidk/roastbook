import { describe, expect, it } from 'bun:test'
import { isCommandPaletteShortcut } from '@/lib/command-palette-shortcut'

function keyEvent(
  overrides: Partial<Parameters<typeof isCommandPaletteShortcut>[0]> = {},
) {
  return {
    altKey: false,
    code: 'KeyK',
    ctrlKey: false,
    key: 'k',
    metaKey: false,
    repeat: false,
    shiftKey: false,
    ...overrides,
  }
}

describe('command palette shortcut', () => {
  it('accepts Command-K and Control-K', () => {
    expect(isCommandPaletteShortcut(keyEvent({ metaKey: true }))).toBe(true)
    expect(isCommandPaletteShortcut(keyEvent({ ctrlKey: true }))).toBe(true)
  })

  it('uses the physical K key across keyboard layouts', () => {
    expect(
      isCommandPaletteShortcut(keyEvent({ ctrlKey: true, key: 'κ' })),
    ).toBe(true)
  })

  it('rejects modified, repeated, and unrelated shortcuts', () => {
    expect(
      isCommandPaletteShortcut(keyEvent({ ctrlKey: true, shiftKey: true })),
    ).toBe(false)
    expect(
      isCommandPaletteShortcut(keyEvent({ ctrlKey: true, repeat: true })),
    ).toBe(false)
    expect(
      isCommandPaletteShortcut(
        keyEvent({ code: 'KeyP', ctrlKey: true, key: 'p' }),
      ),
    ).toBe(false)
  })
})
