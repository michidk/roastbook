import { describe, expect, test } from 'bun:test'
import { EMPTY_SHOT_FORM_VALUES } from '@/components/shots/shot-parameter-fields'
import { newShotPayload } from '@/lib/new-shot-payload'

describe('new brew payload', () => {
  test('keeps a new brew unrated until the user chooses a rating', () => {
    const values = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '1',
    }

    expect(newShotPayload(values, []).rating).toBeNull()
    expect(newShotPayload({ ...values, rating: 4 }, []).rating).toBe(4)
  })
})
