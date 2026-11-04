import * as remote from '@/lib/server/suggestions'
import { journalFunction } from '../journal-function'
export const getBeanSuggestions = journalFunction(
  remote.getBeanSuggestions,
  'suggestions/getBeanSuggestions',
  false,
)
export const getBrewingMethodSuggestions = journalFunction(
  remote.getBrewingMethodSuggestions,
  'suggestions/getBrewingMethodSuggestions',
  false,
)
export const getDrinkTypeSuggestions = journalFunction(
  remote.getDrinkTypeSuggestions,
  'suggestions/getDrinkTypeSuggestions',
  false,
)
export const getTasteTagSuggestions = journalFunction(
  remote.getTasteTagSuggestions,
  'suggestions/getTasteTagSuggestions',
  false,
)
export const getLastBeansByBrewingMethod = journalFunction(
  remote.getLastBeansByBrewingMethod,
  'suggestions/getLastBeansByBrewingMethod',
  false,
)
