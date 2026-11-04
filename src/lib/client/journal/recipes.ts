import * as remote from '@/lib/server/recipes'
import { journalFunction } from '../journal-function'
export const getRecipes = journalFunction(
  remote.getRecipes,
  'recipes/getRecipes',
  false,
)
export const getRecipeOptions = journalFunction(
  remote.getRecipeOptions,
  'recipes/getRecipeOptions',
  false,
)
export const getRecipePage = journalFunction(
  remote.getRecipePage,
  'recipes/getRecipePage',
  false,
)
export const getRecipe = journalFunction(
  remote.getRecipe,
  'recipes/getRecipe',
  false,
)
export const updateRecipe = journalFunction(
  remote.updateRecipe,
  'recipes/updateRecipe',
  true,
)
export const createRecipe = journalFunction(
  remote.createRecipe,
  'recipes/createRecipe',
  true,
)
export const saveShotAsRecipe = journalFunction(
  remote.saveShotAsRecipe,
  'recipes/saveShotAsRecipe',
  true,
)
export const deleteRecipe = journalFunction(
  remote.deleteRecipe,
  'recipes/deleteRecipe',
  true,
)
