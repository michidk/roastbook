import { sql } from 'drizzle-orm'

// Recipe mutations retain their atomic statement shape without creating a sync log.
export const recipeReplicationMutation = () => ({ statement: sql`select 1` })
export const recipeReplicationDeletionMutation = () =>
  recipeReplicationMutation()
