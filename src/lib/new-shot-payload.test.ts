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

  test('copies recipe values without persisting template attribution', () => {
    const payload = newShotPayload(
      {
        ...EMPTY_SHOT_FORM_VALUES,
        brewingMethodId: '1',
        doseGrams: '18.00',
        targetTimeSeconds: '30.00',
      },
      [],
    )

    expect(payload).toMatchObject({
      brewingMethodId: 1,
      doseGrams: '18.00',
      targetTimeSeconds: '30.00',
    })
    expect(payload).not.toHaveProperty('recipeId')
  })

  test('normalizes cleared sensory intensities to null', () => {
    const values = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '1',
      bitterness: 3,
      sweetness: 5,
    }

    expect(newShotPayload(values, [])).toMatchObject({
      bitterness: 3,
      acidity: null,
      sweetness: 5,
      body: null,
      astringency: null,
    })
  })
})
