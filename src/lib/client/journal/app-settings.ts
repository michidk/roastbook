import * as remote from '@/lib/server/app-settings'
import { journalFunction } from '../journal-function'
export const getAppSettings = journalFunction(
  remote.getAppSettings,
  'app-settings/getAppSettings',
  false,
)
