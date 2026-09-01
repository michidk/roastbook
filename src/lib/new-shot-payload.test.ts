import { describe, expect, test } from 'bun:test'
import { newShotPayload, recipePayload } from '@/lib/new-shot-payload'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'

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

  test('stores an optional drink type on a recipe without drink options', () => {
    const values = {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId: '1',
      drinkTypeId: '4',
      drinkOptionValueIds: { '2': '7' },
    }

    expect(recipePayload(values)).toMatchObject({
      brewingMethodId: 1,
      drinkTypeId: 4,
    })
    expect(recipePayload(values)).not.toHaveProperty('drinkOptionValueIds')
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
