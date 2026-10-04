import { describe, expect, test } from 'bun:test'
import { getVisibleTasteTags } from '@/components/shots/taste-tag-selector'

const tags = [
  { id: 1, name: 'Berry' },
  { id: 2, name: 'Citrus' },
  { id: 3, name: 'Floral' },
  { id: 4, name: 'Nutty' },
] as const

describe('taste tag visibility', () => {
  test('orders collapsed tags by usage-ranked featured ids', () => {
    expect(getVisibleTasteTags(tags, [3, 1], [], false)).toEqual([
      tags[2],
      tags[0],
    ])
  })

  test('keeps selected tags visible after the featured tags', () => {
    expect(getVisibleTasteTags(tags, [3, 1], [2], false)).toEqual([
      tags[2],
      tags[0],
      tags[1],
    ])
  })

  test('restores the configured tag order when expanded', () => {
    expect(getVisibleTasteTags(tags, [3, 1], [2], true)).toEqual(tags)
  })
})
