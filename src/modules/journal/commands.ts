import type {
  JournalCommand,
  JournalState,
} from '@roastbook/journal-domain/state'
import { brewCommands } from './brew-commands'
import { catalogCommands } from './catalog-commands'
import { executeJournalCommand } from './command-context'
import { imageCommands } from './images'
import { settingsCommands } from './settings'

export const journalCommands = {
  ...imageCommands,
  ...catalogCommands,
  ...brewCommands,
  ...settingsCommands,
}
export function executeCommand(state: JournalState, command: JournalCommand) {
  return executeJournalCommand(state, command, journalCommands)
}
