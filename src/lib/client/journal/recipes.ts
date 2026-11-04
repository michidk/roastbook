import * as remote from '@/lib/server/recipes'
import { journalRead, journalWrite } from '../journal-function'
export const getRecipes = journalRead(remote.getRecipes, 'recipes/getRecipes')
export const getRecipeOptions = journalRead(
  remote.getRecipeOptions,
  'recipes/getRecipeOptions',
)
export const getRecipePage = journalRead(
  remote.getRecipePage,
  'recipes/getRecipePage',
)
export const getRecipe = journalRead(remote.getRecipe, 'recipes/getRecipe')
export const updateRecipe = journalWrite(
  remote.updateRecipe,
  'recipes/updateRecipe',
)
export const createRecipe = journalWrite(
  remote.createRecipe,
  'recipes/createRecipe',
)
export const saveShotAsRecipe = journalWrite(
  remote.saveShotAsRecipe,
  'recipes/saveShotAsRecipe',
)
export const deleteRecipe = journalWrite(
  remote.deleteRecipe,
  'recipes/deleteRecipe',
)
