import { describe, expect, test } from 'bun:test'
import { projectShotParameters } from '@/lib/server/shot-parameter-projection'

describe('shot parameter projection', () => {
  test('keeps supported distribution methods', () => {
    expect(
      projectShotParameters({ distributionMethod: 'Distribution tool' }, [
        'distributionMethod',
      ]).distributionMethod,
    ).toBe('Distribution tool')
  })

  test('drops legacy distribution methods', () => {
    expect(
      projectShotParameters({ distributionMethod: 'Finger distribution' }, [
        'distributionMethod',
      ]).distributionMethod,
    ).toBeNull()
  })
})
