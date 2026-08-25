import { describe, expect, it } from 'bun:test'
import {
  mobileMoreNavItems,
  mobilePrimaryNavItems,
  moreNavItems,
  primaryNavItems,
} from '@/components/app-navbar-items'

describe('navbar item placement', () => {
  it('moves cafés from the mobile bar into the mobile More menu', () => {
    expect(mobilePrimaryNavItems.map((item) => item.url)).toEqual([
      '/brews',
      '/beans',
      '/visits',
    ])
    expect(mobileMoreNavItems[0]?.url).toBe('/places')
  })

  it('keeps cafés in the desktop primary navigation', () => {
    expect(primaryNavItems.some((item) => item.url === '/places')).toBe(true)
    expect(moreNavItems.some((item) => item.url === '/places')).toBe(false)
  })
})
