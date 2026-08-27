import { describe, expect, test } from 'bun:test'
import { getStoredImagePaths } from '@/lib/image-path'

describe('media lifecycle paths', () => {
  test('pairs every original with the thumbnail cleanup target', () => {
    expect(
      getStoredImagePaths(['beans/1/front.jpg', 'beans/1/back.png']),
    ).toEqual([
      'beans/1/front.jpg',
      'beans/1/front.thumb.webp',
      'beans/1/front.small.webp',
      'beans/1/back.png',
      'beans/1/back.thumb.webp',
      'beans/1/back.small.webp',
    ])
  })
})
