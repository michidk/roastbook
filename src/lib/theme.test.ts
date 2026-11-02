import { describe, expect, test } from 'bun:test'
import {
  isDarkTheme,
  resolveDarkTheme,
  resolveLightTheme,
  THEME_COLORS,
  themeColor,
} from '@/lib/theme'

describe('theme resolution', () => {
  test('honors explicit preferences', () => {
    expect(isDarkTheme('dark', false)).toBe(true)
    expect(isDarkTheme('light', true)).toBe(false)
  })

  test('uses the system preference for system and invalid values', () => {
    expect(isDarkTheme('system', true)).toBe(true)
    expect(isDarkTheme('system', false)).toBe(false)
    expect(isDarkTheme('invalid', true)).toBe(true)
  })

  test('maps the effective theme to the page color', () => {
    expect(themeColor(true)).toBe(THEME_COLORS.dark)
    expect(themeColor(false)).toBe(THEME_COLORS.light)
  })
})

describe('palette preferences', () => {
  test('uses the chosen palette for each mode', () => {
    expect(themeColor(false, 'pure-light', 'classic-dark')).toBe('#ffffff')
    expect(themeColor(true, 'pure-light', 'classic-dark')).toBe('#191919')
    expect(themeColor(true, 'classic-light', 'pure-dark')).toBe('#000000')
  })
})

test('migrates previous palette names and rejects invalid modes', () => {
  expect(resolveLightTheme('oat-milk')).toBe('classic-light')
  expect(resolveLightTheme('garden-cafe')).toBe('pure-light')
  expect(resolveDarkTheme('forest-coffee')).toBe('classic-dark')
  expect(resolveDarkTheme('warm-mocha')).toBe('pure-dark')
  expect(resolveLightTheme('pure-dark')).toBe('light-roast')
  expect(resolveDarkTheme(null)).toBe('dark-roast')
})
