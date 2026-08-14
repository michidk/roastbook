import { describe, expect, test } from 'bun:test'
import { recipeTargetSchema, shotRecipeTargetSchema } from './recipe-target'

describe('recipe target validation', () => {
  test('accepts one existing recipe', () => {
    expect(recipeTargetSchema.parse({ recipeId: 7 })).toEqual({ recipeId: 7 })
  })

  test('trims the name of a new recipe', () => {
    expect(recipeTargetSchema.parse({ name: '  Morning espresso  ' })).toEqual({
      name: 'Morning espresso',
    })
  })

  test('requires exactly one target', () => {
    expect(recipeTargetSchema.safeParse({}).success).toBe(false)
    expect(
      recipeTargetSchema.safeParse({ recipeId: 7, name: 'Duplicate' }).success,
    ).toBe(false)
  })

  test('requires a shot for persisted-brew actions', () => {
    expect(
      shotRecipeTargetSchema.safeParse({ shotId: 3, recipeId: 7 }).success,
    ).toBe(true)
    expect(shotRecipeTargetSchema.safeParse({ recipeId: 7 }).success).toBe(
      false,
    )
  })
})
