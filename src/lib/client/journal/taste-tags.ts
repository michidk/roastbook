import * as remote from '@/lib/server/taste-tags'
import { journalRead, journalWrite } from '../journal-function'
export const getTasteTags = journalRead(
  remote.getTasteTags,
  'taste-tags/getTasteTags',
)
export const createTasteTag = journalWrite(
  remote.createTasteTag,
  'taste-tags/createTasteTag',
)
export const deleteTasteTag = journalWrite(
  remote.deleteTasteTag,
  'taste-tags/deleteTasteTag',
)
