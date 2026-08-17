import { describe, expect, test } from 'bun:test'
import {
  getFaviconStoragePath,
  getStoredFaviconUrl,
  getWebsiteOrigin,
} from '@/lib/favicon'

describe('favicon helpers', () => {
  test('normalizes a website to its public origin', () => {
    expect(getWebsiteOrigin('https://coffee.example/about?q=1')).toBe(
      'https://coffee.example',
    )
  })

  test('rejects unsupported or missing websites', () => {
    expect(getWebsiteOrigin(null)).toBeUndefined()
    expect(getWebsiteOrigin('not a URL')).toBeUndefined()
    expect(getWebsiteOrigin('ftp://coffee.example')).toBeUndefined()
  })

  test('uses a deterministic entity storage path', () => {
    expect(getFaviconStoragePath('roasters', 12)).toBe(
      'favicons/roasters/12.png',
    )
    expect(getFaviconStoragePath('coffee-shops', 7)).toBe(
      'favicons/coffee-shops/7.png',
    )
  })

  test('versions stored favicon URLs by the entity update time', () => {
    expect(
      getStoredFaviconUrl({
        entityType: 'roasters',
        entityId: 12,
        website: 'https://coffee.example',
        updatedAt: '2026-08-14T12:00:00.000Z',
      }),
    ).toBe('/media/favicons/roasters/12.png?v=1786708800000')
  })

  test('uses a stored favicon even when an entity has no website', () => {
    expect(
      getStoredFaviconUrl({
        entityType: 'roasters',
        entityId: 3,
        website: null,
        updatedAt: '2026-08-14T12:00:00.000Z',
      }),
    ).toBe('/media/favicons/roasters/3.png?v=1786708800000')
  })
})
