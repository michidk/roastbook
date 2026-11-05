import { describe, expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import {
  PALETTE_RESTORE_SCRIPT,
  PALETTE_STORAGE_KEY,
  THEME_BOOTSTRAP_SCRIPT,
  themeColor,
} from '@/lib/theme'

function bootstrap(
  raw: string | null,
  systemDark: boolean,
  serverSettings: Record<string, string> = {},
) {
  const dataset: Record<string, string> = {
    lightTheme: 'light-roast',
    darkTheme: 'dark-roast',
    backgroundGrain: 'true',
    ...serverSettings,
  }
  const style: Record<string, string> = {}
  let dark = false
  let metaColor = ''
  runInNewContext(THEME_BOOTSTRAP_SCRIPT, {
    localStorage: { getItem: () => raw },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: {
      documentElement: {
        dataset,
        style,
        classList: {
          toggle: (_name: string, value: boolean) => {
            dark = value
          },
        },
      },
      querySelectorAll: () => [
        {
          setAttribute: (_name: string, value: string) => {
            metaColor = value
          },
        },
      ],
    },
  })
  return { dataset, style, dark, metaColor }
}

describe('theme persistence and first paint', () => {
  test('legacy and damaged storage retain safe defaults', () => {
    for (const raw of [
      null,
      '{',
      JSON.stringify({
        state: {
          theme: 'dark',
          lightTheme: 'classic-dark',
          darkTheme: 'unknown',
        },
      }),
    ]) {
      const result = bootstrap(raw, true)
      expect(result.dataset).toEqual({
        lightTheme: 'light-roast',
        darkTheme: 'dark-roast',
        backgroundGrain: 'true',
      })
      expect(result.metaColor).toBe(themeColor(true))
    }
  })

  test('browser mode uses the saved palette before hydration', () => {
    const raw = JSON.stringify({
      state: {
        theme: 'system',
        lightTheme: 'pure-light',
        darkTheme: 'classic-dark',
      },
    })
    for (const systemDark of [true, false]) {
      const result = bootstrap(raw, systemDark, {
        lightTheme: 'pure-light',
        darkTheme: 'classic-dark',
      })
      expect(result.dark).toBe(systemDark)
      expect(result.style.colorScheme).toBe(systemDark ? 'dark' : 'light')
      expect(result.metaColor).toBe(
        themeColor(systemDark, 'pure-light', 'classic-dark'),
      )
      expect(result.style.backgroundColor).toBe(result.metaColor)
    }
  })

  test('explicit mode overrides the operating system', () => {
    const result = bootstrap(
      JSON.stringify({
        state: { theme: 'light', lightTheme: 'classic-light' },
      }),
      true,
      { lightTheme: 'classic-light' },
    )
    expect(result.dark).toBe(false)
    expect(result.metaColor).toBe('#f7f5f1')
  })
})

test('server settings override stale browser palette and grain choices', () => {
  const result = bootstrap(
    JSON.stringify({
      state: {
        theme: 'dark',
        lightTheme: 'oat-milk',
        darkTheme: 'warm-mocha',
        backgroundGrainEnabled: true,
      },
    }),
    false,
    {
      lightTheme: 'pure-light',
      darkTheme: 'classic-dark',
      backgroundGrain: 'false',
    },
  )
  expect(result.dataset).toEqual({
    lightTheme: 'pure-light',
    darkTheme: 'classic-dark',
    backgroundGrain: 'false',
  })
  expect(result.metaColor).toBe('#191919')
})

test('pages without account settings restore the last applied palettes', () => {
  const dataset: Record<string, string> = {}
  const document = {
    documentElement: {
      dataset,
      style: {} as Record<string, string>,
      classList: { toggle: () => undefined },
    },
    querySelectorAll: () => [],
  }
  const saved = JSON.stringify({ lightTheme: 'pure-light', darkTheme: 'nope' })
  runInNewContext(`${PALETTE_RESTORE_SCRIPT};\n${THEME_BOOTSTRAP_SCRIPT}`, {
    localStorage: {
      getItem: (key: string) => (key === PALETTE_STORAGE_KEY ? saved : null),
    },
    window: { matchMedia: () => ({ matches: false }) },
    document,
  })
  // Known ids apply; unknown ones fall back to the default palette.
  expect(dataset.lightTheme).toBe('pure-light')
  expect(dataset.darkTheme).toBe('dark-roast')
  expect(document.documentElement.style.backgroundColor).toBe('#ffffff')
})
