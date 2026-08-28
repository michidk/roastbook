import { describe, expect, it } from 'bun:test'
import { commandEntitySearchTerm } from '@/lib/command-search-contract'

describe('command entity search terms', () => {
  it('shows recent items for an entity-only query', () => {
    expect(commandEntitySearchTerm('gear', ['gear', 'equipment'])).toBe('')
    expect(commandEntitySearchTerm('BEANS', ['bean', 'beans'])).toBe('')
  })

  it('removes an entity prefix before searching its collection', () => {
    expect(commandEntitySearchTerm('gear  grinder', ['gear'])).toBe('grinder')
    expect(commandEntitySearchTerm('café Berlin', ['cafe', 'café'])).toBe(
      'Berlin',
    )
  })

  it('leaves an ordinary query unchanged', () => {
    expect(commandEntitySearchTerm('AeroPress Clear', ['gear'])).toBe(
      'AeroPress Clear',
    )
  })
})
