import * as remote from '@/lib/server/suggestions'
import { journalRead } from '../journal-function'
export const getBeanSuggestions = journalRead(
  remote.getBeanSuggestions,
  'suggestions/getBeanSuggestions',
)
export const getBrewingMethodSuggestions = journalRead(
  remote.getBrewingMethodSuggestions,
  'suggestions/getBrewingMethodSuggestions',
)
export const getDrinkTypeSuggestions = journalRead(
  remote.getDrinkTypeSuggestions,
  'suggestions/getDrinkTypeSuggestions',
)
export const getTasteTagSuggestions = journalRead(
  remote.getTasteTagSuggestions,
  'suggestions/getTasteTagSuggestions',
)
export const getLastBeansByBrewingMethod = journalRead(
  remote.getLastBeansByBrewingMethod,
  'suggestions/getLastBeansByBrewingMethod',
)
