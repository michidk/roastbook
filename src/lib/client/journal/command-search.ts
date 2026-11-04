import { searchCommandEntities as remote } from '@/lib/server/command-search'
import { journalFunction } from '../journal-function'

export const searchCommandEntities = journalFunction(
  remote,
  'command-search/searchCommandEntities',
  false,
)
