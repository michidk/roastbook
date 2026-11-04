import * as remote from '@/lib/server/app-settings'
import { journalRead } from '../journal-function'
export const getAppSettings = journalRead(
  remote.getAppSettings,
  'app-settings/getAppSettings',
)
