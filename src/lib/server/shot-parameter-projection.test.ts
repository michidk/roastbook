import { describe, expect, test } from 'bun:test'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/lib/server/shot-parameter-projection'

describe('shot parameter projection', () => {
  test('keeps enabled values, clears disabled values, and deduplicates gear', () => {
    const result = projectShotParameters(
      {
        machineId: 4,
        doseGrams: '18.00',
        yieldGrams: '36.00',
        usesPuckScreen: false,
        accessoryGearIds: [7, 7, 9],
      },
      ['doseGrams', 'usesPuckScreen', 'accessoryGearIds', 'unknown'],
    )

    expect(result.doseGrams).toBe('18.00')
    expect(result.machineId).toBeNull()
    expect(result.yieldGrams).toBeNull()
    expect(result.usesPuckScreen).toBe(false)
    expect(
      projectAccessoryGearIds({ accessoryGearIds: [7, 7, 9] }, [
        'accessoryGearIds',
      ]),
    ).toEqual([7, 9])
  })

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
