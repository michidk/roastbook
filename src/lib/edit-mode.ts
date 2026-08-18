import { z } from 'zod'

/** Optional URL state shared by detail pages with read and edit modes. */
export const editModeSearchField = z.boolean().optional().catch(undefined)
