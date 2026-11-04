import * as remote from '@/lib/server/taste-tags'
import { journalFunction } from '../journal-function'
export const getTasteTags = journalFunction(
  remote.getTasteTags,
  'taste-tags/getTasteTags',
  false,
)
export const createTasteTag = journalFunction(
  remote.createTasteTag,
  'taste-tags/createTasteTag',
  true,
)
export const deleteTasteTag = journalFunction(
  remote.deleteTasteTag,
  'taste-tags/deleteTasteTag',
  true,
)
