import { searchCommandEntities as remote } from '@/lib/server/command-search'
import { journalRead } from '../journal-function'

export const searchCommandEntities = journalRead(
  remote,
  'command-search/searchCommandEntities',
)
