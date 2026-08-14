import { describe, expect, test } from 'bun:test'
import { isTimeZone } from '@/lib/app-settings'

describe('application settings', () => {
  test('accepts IANA time zones and rejects invalid values', () => {
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Europe/Berlin')).toBe(true)
    expect(isTimeZone('Not/A_Time_Zone')).toBe(false)
    expect(isTimeZone('')).toBe(false)
  })
})
